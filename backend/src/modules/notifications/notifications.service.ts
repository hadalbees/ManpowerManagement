import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import { CreateNotificationDto, NotificationQueryDto } from './dto/notification.dto';
import { NotificationPriority } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotently dispatches a notification.
   * If dedupKey is provided, existing notifications with that key will not be duplicated.
   */
  async emitNotification(agencyId: string, dto: CreateNotificationDto) {
    if (dto.dedupKey) {
      return this.prisma.notification.upsert({
        where: { dedupKey: dto.dedupKey },
        update: {}, // idempotent no-op if already dispatched
        create: {
          agencyId,
          userId: dto.userId,
          branchId: dto.branchId || null,
          title: dto.title,
          body: dto.body,
          category: dto.category,
          priority: dto.priority || NotificationPriority.NORMAL,
          actionUrl: dto.actionUrl || null,
          referenceType: dto.referenceType || null,
          referenceId: dto.referenceId || null,
          dedupKey: dto.dedupKey,
          metadata: dto.metadata || null,
        },
      });
    }

    return this.prisma.notification.create({
      data: {
        agencyId,
        userId: dto.userId,
        branchId: dto.branchId || null,
        title: dto.title,
        body: dto.body,
        category: dto.category,
        priority: dto.priority || NotificationPriority.NORMAL,
        actionUrl: dto.actionUrl || null,
        referenceType: dto.referenceType || null,
        referenceId: dto.referenceId || null,
        metadata: dto.metadata || null,
      },
    });
  }

  async getUserNotifications(query: NotificationQueryDto, user: AuthenticatedUserContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId: user.agencyId,
      userId: user.id,
    };

    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;
    if (query.isRead !== undefined) where.isRead = query.isRead;

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { agencyId: user.agencyId, userId: user.id, isRead: false },
      }),
    ]);

    return {
      items,
      unreadCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(user: AuthenticatedUserContext): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: {
        agencyId: user.agencyId,
        userId: user.id,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  async markAsRead(id: string, user: AuthenticatedUserContext) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.agencyId !== user.agencyId) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== user.id) {
      throw new ForbiddenException('Cannot modify notifications belonging to another user');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(user: AuthenticatedUserContext) {
    const updated = await this.prisma.notification.updateMany({
      where: {
        agencyId: user.agencyId,
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      count: updated.count,
      markedCount: updated.count,
    };
  }
}
