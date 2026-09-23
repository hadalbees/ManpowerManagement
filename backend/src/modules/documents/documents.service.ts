import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from './storage.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  CreateDocumentTypeDto,
  UploadDocumentDto,
  CreateDocumentVersionDto,
  VerifyDocumentDto,
  DocumentQueryDto,
} from './dto/document.dto';
import { VerificationStatus, AuditAction, DocumentEntityType } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  // ==========================================
  // 1. DOCUMENT TYPES
  // ==========================================

  async createDocumentType(dto: CreateDocumentTypeDto, user: AuthenticatedUserContext) {
    const existing = await this.prisma.documentType.findUnique({
      where: {
        agencyId_code: {
          agencyId: user.agencyId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Document type code '${dto.code}' already exists for this agency`);
    }

    return this.prisma.documentType.create({
      data: {
        agencyId: user.agencyId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        applicableEntity: dto.applicableEntity,
        isMandatory: dto.isMandatory ?? false,
        requiresExpiryDate: dto.requiresExpiryDate ?? false,
        defaultAlertDays: dto.defaultAlertDays ?? [60, 30, 15, 7],
      },
    });
  }

  async getDocumentTypes(entityType?: DocumentEntityType, user?: AuthenticatedUserContext) {
    const agencyId = user?.agencyId;
    return this.prisma.documentType.findMany({
      where: {
        ...(agencyId ? { agencyId } : {}),
        ...(entityType ? { applicableEntity: entityType } : {}),
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ==========================================
  // 2. DOCUMENT UPLOADS & MANAGEMENT
  // ==========================================

  async uploadDocument(dto: UploadDocumentDto, user: AuthenticatedUserContext) {
    this.storageService.validateUpload(dto.mimeType, dto.fileSizeBytes);

    const docType = await this.prisma.documentType.findFirst({
      where: { id: dto.documentTypeId, agencyId: user.agencyId },
    });
    if (!docType) {
      throw new NotFoundException('Document type not found for this agency');
    }

    const storageKey =
      dto.s3StorageKey ||
      this.storageService.generateStorageKey(
        user.agencyId,
        dto.entityType,
        dto.entityId,
        dto.originalFileName,
      );

    const branchId = user.branchId || dto.branchId || null;

    const doc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          agencyId: user.agencyId,
          branchId,
          documentTypeId: dto.documentTypeId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          documentNumber: dto.documentNumber || null,
          title: dto.title || docType.name,
          description: dto.description || null,
          issuedBy: dto.issuedBy || null,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          storageProvider: 'S3_COMPLIANT',
          s3StorageKey: storageKey,
          originalFileName: dto.originalFileName,
          fileSizeBytes: dto.fileSizeBytes,
          mimeType: dto.mimeType,
          checksum: dto.checksum || null,
          version: 1,
          isCurrent: true,
          verificationStatus: VerificationStatus.PENDING,
          uploadedById: user.id,
          metadata: dto.metadata || null,
        },
        include: {
          documentType: true,
          uploadedBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      // Create initial Version 1
      await tx.documentVersion.create({
        data: {
          documentId: created.id,
          versionNumber: 1,
          s3StorageKey: storageKey,
          originalFileName: dto.originalFileName,
          fileSizeBytes: dto.fileSizeBytes,
          mimeType: dto.mimeType,
          checksum: dto.checksum || null,
          uploadedById: user.id,
          reason: 'Initial document upload',
        },
      });

      return created;
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId,
      userId: user.id,
      entityName: 'Document',
      entityId: doc.id,
      action: AuditAction.CREATE,
      changeSummary: `DOCUMENT_UPLOADED: Uploaded ${docType.name} (${dto.originalFileName}) for ${dto.entityType} ${dto.entityId}`,
      newValues: {
        documentNumber: dto.documentNumber,
        originalFileName: dto.originalFileName,
        fileSizeBytes: dto.fileSizeBytes,
        mimeType: dto.mimeType,
        expiryDate: dto.expiryDate,
      },
    });

    return doc;
  }

  async createVersion(id: string, dto: CreateDocumentVersionDto, user: AuthenticatedUserContext) {
    const doc = await this.getDocumentById(id, user);

    this.storageService.validateUpload(dto.mimeType, dto.fileSizeBytes);

    const newVersionNumber = doc.version + 1;
    const storageKey =
      dto.s3StorageKey ||
      this.storageService.generateStorageKey(
        user.agencyId,
        doc.entityType,
        doc.entityId,
        dto.originalFileName,
      );

    const updatedDoc = await this.prisma.$transaction(async (tx) => {
      // Record Version History
      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: newVersionNumber,
          s3StorageKey: storageKey,
          originalFileName: dto.originalFileName,
          fileSizeBytes: dto.fileSizeBytes,
          mimeType: dto.mimeType,
          checksum: dto.checksum || null,
          uploadedById: user.id,
          reason: dto.reason || `Uploaded new revision (Version ${newVersionNumber})`,
        },
      });

      // Update Parent Document
      return tx.document.update({
        where: { id: doc.id },
        data: {
          version: newVersionNumber,
          s3StorageKey: storageKey,
          originalFileName: dto.originalFileName,
          fileSizeBytes: dto.fileSizeBytes,
          mimeType: dto.mimeType,
          checksum: dto.checksum || null,
          verificationStatus: VerificationStatus.PENDING,
          uploadedById: user.id,
          verifiedById: null,
          verifiedAt: null,
          rejectionReason: null,
        },
        include: {
          documentType: true,
          versions: { orderBy: { versionNumber: 'desc' } },
        },
      });
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: doc.branchId,
      userId: user.id,
      entityName: 'Document',
      entityId: doc.id,
      action: AuditAction.UPDATE,
      changeSummary: `DOCUMENT_VERSION_CREATED: Uploaded revision v${newVersionNumber} (${dto.originalFileName})`,
      newValues: {
        version: newVersionNumber,
        originalFileName: dto.originalFileName,
        fileSizeBytes: dto.fileSizeBytes,
      },
    });

    return updatedDoc;
  }

  async verifyDocument(id: string, dto: VerifyDocumentDto, user: AuthenticatedUserContext) {
    const doc = await this.getDocumentById(id, user);

    const updated = await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        verificationStatus: dto.status,
        verifiedById: user.id,
        verifiedAt: new Date(),
        rejectionReason: dto.status === VerificationStatus.REJECTED ? dto.rejectionReason || 'Rejected by reviewer' : null,
      },
      include: {
        documentType: true,
        verifiedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    const isVerified = dto.status === VerificationStatus.VERIFIED;
    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: doc.branchId,
      userId: user.id,
      entityName: 'Document',
      entityId: doc.id,
      action: isVerified ? AuditAction.APPROVE : AuditAction.UPDATE,
      changeSummary: isVerified
        ? `DOCUMENT_VERIFIED: Approved document verification by ${user.email}`
        : `DOCUMENT_REJECTED: Document rejected: ${dto.rejectionReason || 'No reason specified'}`,
      newValues: {
        verificationStatus: dto.status,
        verifiedAt: updated.verifiedAt,
        rejectionReason: updated.rejectionReason,
      },
    });

    return updated;
  }

  async getDocuments(query: DocumentQueryDto, user: AuthenticatedUserContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId: user.agencyId,
      deletedAt: null,
    };

    if (user.branchId) {
      where.OR = [{ branchId: user.branchId }, { branchId: null }];
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { documentNumber: { contains: query.search, mode: 'insensitive' } },
        { originalFileName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          documentType: true,
          uploadedBy: { select: { id: true, fullName: true, email: true } },
          verifiedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDocumentById(id: string, user: AuthenticatedUserContext) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        documentType: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { uploadedBy: { select: { id: true, fullName: true, email: true } } },
        },
        uploadedBy: { select: { id: true, fullName: true, email: true } },
        verifiedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!doc || doc.agencyId !== user.agencyId || Boolean(doc.deletedAt)) {
      throw new NotFoundException('Document not found');
    }

    if (user.branchId && doc.branchId && doc.branchId !== user.branchId) {
      throw new ForbiddenException('Document belongs to a different branch');
    }

    return doc;
  }

  async generateDownloadUrl(id: string, user: AuthenticatedUserContext) {
    const doc = await this.getDocumentById(id, user);

    const presigned = this.storageService.generatePresignedDownloadUrl(
      doc.s3StorageKey,
      user.agencyId,
      user.id,
      15, // 15 minutes TTL
    );

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: doc.branchId,
      userId: user.id,
      entityName: 'Document',
      entityId: doc.id,
      action: AuditAction.UPDATE,
      changeSummary: `DOCUMENT_DOWNLOADED: Presigned download link generated for ${doc.originalFileName}`,
    });

    return {
      documentId: doc.id,
      fileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSizeBytes: doc.fileSizeBytes,
      downloadUrl: presigned.url,
      expiresAt: presigned.expiresAt,
    };
  }

  async softDeleteDocument(id: string, user: AuthenticatedUserContext) {
    const doc = await this.getDocumentById(id, user);

    const deleted = await this.prisma.document.update({
      where: { id: doc.id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: doc.branchId,
      userId: user.id,
      entityName: 'Document',
      entityId: doc.id,
      action: AuditAction.DELETE,
      changeSummary: `DOCUMENT_DELETED: Soft deleted document ${doc.title || doc.originalFileName}`,
    });

    return deleted;
  }
}
