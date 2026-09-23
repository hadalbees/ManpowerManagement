import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  CreateDocumentTypeDto,
  UploadDocumentDto,
  CreateDocumentVersionDto,
  VerifyDocumentDto,
  DocumentQueryDto,
} from './dto/document.dto';
import { DocumentEntityType } from '@prisma/client';

@Controller('documents')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('types')
  @RequirePermission('DOCUMENT_CREATE')
  async createDocumentType(
    @Body() dto: CreateDocumentTypeDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.createDocumentType(dto, user);
  }

  @Get('types')
  @RequirePermission('DOCUMENT_READ')
  async getDocumentTypes(
    @Query('entityType') entityType: DocumentEntityType,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.getDocumentTypes(entityType, user);
  }

  @Post()
  @RequirePermission('DOCUMENT_CREATE')
  async uploadDocument(
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.uploadDocument(dto, user);
  }

  @Get()
  @RequirePermission('DOCUMENT_READ')
  async getDocuments(
    @Query() query: DocumentQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.getDocuments(query, user);
  }

  @Get(':id')
  @RequirePermission('DOCUMENT_READ')
  async getDocumentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.getDocumentById(id, user);
  }

  @Post(':id/versions')
  @RequirePermission('DOCUMENT_CREATE')
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentVersionDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.createVersion(id, dto, user);
  }

  @Post(':id/verify')
  @RequirePermission('DOCUMENT_VERIFY')
  async verifyDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.verifyDocument(id, dto, user);
  }

  @Get(':id/download-url')
  @RequirePermission('DOCUMENT_DOWNLOAD')
  async generateDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.generateDownloadUrl(id, user);
  }

  @Delete(':id')
  @RequirePermission('DOCUMENT_DELETE')
  async softDeleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.softDeleteDocument(id, user);
  }
}
