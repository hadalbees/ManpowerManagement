import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import { NotificationQueryDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermission('NOTIFICATION_READ')
  async getUserNotifications(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.notificationsService.getUserNotifications(query, user);
  }

  @Get('unread-count')
  @RequirePermission('NOTIFICATION_READ')
  async getUnreadCount(@CurrentUser() user: AuthenticatedUserContext) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Patch(':id/read')
  @RequirePermission('NOTIFICATION_UPDATE')
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.notificationsService.markAsRead(id, user);
  }

  @Post('mark-all-read')
  @RequirePermission('NOTIFICATION_UPDATE')
  async markAllAsRead(@CurrentUser() user: AuthenticatedUserContext) {
    return this.notificationsService.markAllAsRead(user);
  }
}
