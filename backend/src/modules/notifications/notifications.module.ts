import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
