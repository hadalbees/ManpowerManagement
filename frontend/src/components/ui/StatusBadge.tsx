'use client';

import React from 'react';
import { 
  CheckCircle2, AlertTriangle, XCircle, Clock, 
  Lock, ShieldCheck, UserCheck, HelpCircle 
} from 'lucide-react';

export type StatusType = 
  | 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'APPROVED' | 'REJECTED' 
  | 'DRAFT' | 'REVIEWED' | 'LOCKED' | 'EXPIRED' | 'OVERDUE' 
  | 'SELECTED' | 'HIRED' | 'SUSPENDED' | 'TERMINATED' | 'ON_LEAVE'
  | 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'REPLACEMENT'
  | 'VERIFIED' | 'COMPLETED' | 'UNPAID' | 'PARTIAL' | 'PAID'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export default function StatusBadge({
  status,
  label,
  size = 'sm',
  showIcon = true,
}: StatusBadgeProps) {
  const norm = String(status || '').toUpperCase().trim();
  const displayLabel = label || norm.replace(/_/g, ' ');

  let cssClass = 'status-neutral';
  let Icon = HelpCircle;

  switch (norm) {
    case 'ACTIVE':
    case 'APPROVED':
    case 'HIRED':
    case 'VERIFIED':
    case 'COMPLETED':
    case 'PRESENT':
    case 'PAID':
      cssClass = 'status-active';
      Icon = CheckCircle2;
      break;

    case 'PENDING':
    case 'REVIEWED':
    case 'ON_LEAVE':
    case 'LEAVE':
    case 'PARTIAL':
      cssClass = 'status-warning';
      Icon = Clock;
      break;

    case 'EXPIRED':
    case 'OVERDUE':
    case 'REJECTED':
    case 'SUSPENDED':
    case 'TERMINATED':
    case 'ABSENT':
    case 'UNPAID':
      cssClass = 'status-danger';
      Icon = XCircle;
      break;

    case 'SELECTED':
    case 'REPLACEMENT':
    case 'HOLIDAY':
      cssClass = 'status-info';
      Icon = UserCheck;
      break;

    case 'LOCKED':
      cssClass = 'status-locked';
      Icon = Lock;
      break;

    case 'DRAFT':
    case 'INACTIVE':
    case 'RESIGNED':
    default:
      cssClass = 'status-neutral';
      Icon = AlertTriangle;
      break;
  }

  const paddingStyle = size === 'sm' ? '2px 8px' : '4px 11px';
  const fontSizeStyle = size === 'sm' ? '0.72rem' : '0.8rem';
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`status-badge ${cssClass}`}
      style={{
        padding: paddingStyle,
        fontSize: fontSizeStyle,
      }}
    >
      {showIcon && <Icon size={iconSize} />}
      <span>{displayLabel}</span>
    </span>
  );
}
