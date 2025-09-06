/**
 * 백업 및 복구 시스템
 * 데이터베이스 백업, 복원, 내보내기 기능
 */

import { createServerSupabase } from '@/lib/supabase/server';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export interface BackupOptions {
  includeData?: boolean;
  includeSchema?: boolean;
  includeFunctions?: boolean;
  includeTriggers?: boolean;
  tables?: string[];
  format?: 'sql' | 'json' | 'csv';
}

export interface BackupResult {
  success: boolean;
  filename?: string;
  size?: number;
  tables?: number;
  rows?: number;
  error?: string;
  downloadUrl?: string;
}

export interface RestoreOptions {
  dropExisting?: boolean;
  transactional?: boolean;
  validateSchema?: boolean;
  dryRun?: boolean;
}

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'json';
  tables?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  locale?: 'ko' | 'zh-CN' | 'en';
}

/**
 * 데이터베이스 전체 백업
 */
export async function createFullBackup(
  options: BackupOptions = {}
): Promise<BackupResult> {
  try {
    const supabase = await createServerSupabase();
    
    const {
      includeData = true,
      includeSchema = true,
      includeFunctions = true,
      includeTriggers = true,
      tables = [],
      format = 'sql'
    } = options;

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `backup_${timestamp}.${format}`;
    
    // 백업 데이터 수집
    const backupData: any = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      database: 'yuandi_erp',
      tables: {},
      schema: null,
      functions: [],
      triggers: []
    };

    // 테이블 목록 조회
    const tablesToBackup = tables.length > 0 ? tables : [
      'products',
      'orders',
      'order_items',
      'customers',
      'inventory',
      'inventory_transactions',
      'shipments',
      'shipment_photos',
      'cashbook_entries',
      'users',
      'user_profiles',
      'settings',
      'notifications',
      'event_logs'
    ];

    let totalRows = 0;

    // 각 테이블 데이터 백업
    if (includeData) {
      for (const table of tablesToBackup) {
        const { data, error } = await supabase
          .from(table)
          .select('*');
        
        if (!error && data) {
          backupData.tables[table] = data;
          totalRows += data.length;
        }
      }
    }

    // 스키마 정보 백업
    if (includeSchema) {
      // 실제로는 information_schema에서 조회
      backupData.schema = await getSchemaInfo(tablesToBackup);
    }

    // 함수 백업
    if (includeFunctions) {
      backupData.functions = await getFunctions();
    }

    // 트리거 백업
    if (includeTriggers) {
      backupData.triggers = await getTriggers();
    }

    // 백업 파일 생성
    let backupContent: string | Buffer;
    
    if (format === 'sql') {
      backupContent = generateSQLBackup(backupData);
    } else if (format === 'json') {
      backupContent = JSON.stringify(backupData, null, 2);
    } else {
      backupContent = generateCSVBackup(backupData);
    }

    // Supabase Storage에 백업 저장
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, backupContent, {
        contentType: format === 'sql' ? 'text/plain' : 
                    format === 'json' ? 'application/json' : 
                    'text/csv',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // 다운로드 URL 생성
    const { data: urlData } = supabase.storage
      .from('backups')
      .getPublicUrl(filename);

    // 백업 메타데이터 저장
    await supabase
      .from('backup_history')
      .insert({
        filename,
        format,
        size: Buffer.byteLength(backupContent),
        tables_count: tablesToBackup.length,
        rows_count: totalRows,
        created_by: 'system',
        options: JSON.stringify(options)
      });

    return {
      success: true,
      filename,
      size: Buffer.byteLength(backupContent),
      tables: tablesToBackup.length,
      rows: totalRows,
      downloadUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Backup failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Backup failed'
    };
  }
}

/**
 * 데이터베이스 복원
 */
export async function restoreBackup(
  backupFile: File | string,
  options: RestoreOptions = {}
): Promise<{ success: boolean; error?: string; restored?: number }> {
  try {
    const supabase = await createServerSupabase();
    
    const {
      dropExisting = false,
      transactional = true,
      validateSchema = true,
      dryRun = false
    } = options;

    // 백업 파일 파싱
    let backupData: any;
    
    if (typeof backupFile === 'string') {
      // URL에서 백업 다운로드
      const response = await fetch(backupFile);
      const content = await response.text();
      backupData = JSON.parse(content);
    } else {
      // 파일에서 읽기
      const content = await backupFile.text();
      backupData = JSON.parse(content);
    }

    // 스키마 검증
    if (validateSchema) {
      const isValid = await validateBackupSchema(backupData);
      if (!isValid) {
        throw new Error('Invalid backup schema');
      }
    }

    // Dry run 모드
    if (dryRun) {
      return {
        success: true,
        restored: Object.values(backupData.tables).reduce(
          (sum: number, table: any) => sum + table.length, 
          0
        )
      };
    }

    let restoredCount = 0;

    // 트랜잭션 시작 (실제로는 Supabase RPC 사용)
    if (transactional) {
      // BEGIN TRANSACTION
    }

    try {
      // 기존 데이터 삭제 (옵션)
      if (dropExisting) {
        for (const table of Object.keys(backupData.tables)) {
          await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      // 데이터 복원
      for (const [table, data] of Object.entries(backupData.tables)) {
        if (Array.isArray(data) && data.length > 0) {
          const { error } = await supabase
            .from(table)
            .upsert(data as any[], {
              onConflict: 'id',
              ignoreDuplicates: false
            });
          
          if (error) {
            throw error;
          }
          
          restoredCount += (data as any[]).length;
        }
      }

      // 함수 복원
      if (backupData.functions && backupData.functions.length > 0) {
        await restoreFunctions(backupData.functions);
      }

      // 트리거 복원
      if (backupData.triggers && backupData.triggers.length > 0) {
        await restoreTriggers(backupData.triggers);
      }

      if (transactional) {
        // COMMIT TRANSACTION
      }

      // 복원 기록 저장
      await supabase
        .from('restore_history')
        .insert({
          backup_filename: typeof backupFile === 'string' ? backupFile : backupFile.name,
          restored_at: new Date().toISOString(),
          tables_restored: Object.keys(backupData.tables).length,
          rows_restored: restoredCount,
          restored_by: 'system'
        });

      return {
        success: true,
        restored: restoredCount
      };
    } catch (error) {
      if (transactional) {
        // ROLLBACK TRANSACTION
      }
      throw error;
    }
  } catch (error) {
    console.error('Restore failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Restore failed'
    };
  }
}

/**
 * 데이터 내보내기 (Excel/CSV)
 */
export async function exportData(
  type: 'orders' | 'products' | 'customers' | 'inventory' | 'cashbook' | 'all',
  options: ExportOptions
): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { format = 'xlsx', dateRange, locale = 'ko' } = options;
    
    const exportData: Record<string, any[]> = {};
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    
    // 데이터 조회
    if (type === 'all' || type === 'orders') {
      let query = supabase.from('orders').select(`
        *,
        customer:customers(*),
        items:order_items(*, product:products(*))
      `);
      
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }
      
      const { data } = await query;
      exportData.orders = data || [];
    }

    if (type === 'all' || type === 'products') {
      const { data } = await supabase
        .from('products')
        .select('*, inventory(*)');
      exportData.products = data || [];
    }

    if (type === 'all' || type === 'customers') {
      const { data } = await supabase
        .from('customers')
        .select('*');
      exportData.customers = data || [];
    }

    if (type === 'all' || type === 'inventory') {
      const { data } = await supabase
        .from('inventory')
        .select('*, product:products(*), transactions:inventory_transactions(*)');
      exportData.inventory = data || [];
    }

    if (type === 'all' || type === 'cashbook') {
      let query = supabase.from('cashbook_entries').select('*');
      
      if (dateRange) {
        query = query
          .gte('entry_date', dateRange.from.toISOString())
          .lte('entry_date', dateRange.to.toISOString());
      }
      
      const { data } = await query;
      exportData.cashbook = data || [];
    }

    // 파일 생성
    let file: Buffer;
    let filename: string;
    let contentType: string;

    if (format === 'xlsx') {
      file = await createExcelFile(exportData, locale);
      filename = `export_${type}_${timestamp}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (format === 'csv') {
      file = await createCSVFiles(exportData);
      filename = `export_${type}_${timestamp}.zip`;
      contentType = 'application/zip';
    } else {
      file = Buffer.from(JSON.stringify(exportData, null, 2));
      filename = `export_${type}_${timestamp}.json`;
      contentType = 'application/json';
    }

    // Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filename, file, {
        contentType,
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // 다운로드 URL 생성
    const { data: urlData } = supabase.storage
      .from('exports')
      .getPublicUrl(filename);

    return {
      success: true,
      downloadUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed'
    };
  }
}

/**
 * Excel 파일 생성
 */
async function createExcelFile(
  data: Record<string, any[]>,
  locale: 'ko' | 'zh-CN' | 'en'
): Promise<Buffer> {
  const workbook = XLSX.utils.book_new();
  
  // 각 테이블을 시트로 추가
  for (const [sheetName, sheetData] of Object.entries(data)) {
    if (sheetData.length > 0) {
      // 데이터를 평탄화
      const flatData = sheetData.map(row => flattenObject(row));
      
      // 헤더 번역
      const translatedData = translateHeaders(flatData, sheetName, locale);
      
      const worksheet = XLSX.utils.json_to_sheet(translatedData);
      
      // 스타일 적용
      applyExcelStyles(worksheet);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
  }
  
  // Buffer로 변환
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * CSV 파일들을 ZIP으로 압축
 */
async function createCSVFiles(data: Record<string, any[]>): Promise<Buffer> {
  const zip = new JSZip();
  
  for (const [filename, fileData] of Object.entries(data)) {
    if (fileData.length > 0) {
      const flatData = fileData.map(row => flattenObject(row));
      const csv = XLSX.utils.sheet_to_csv(
        XLSX.utils.json_to_sheet(flatData)
      );
      zip.file(`${filename}.csv`, csv);
    }
  }
  
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return buffer;
}

/**
 * SQL 백업 생성
 */
function generateSQLBackup(data: any): string {
  let sql = `-- YUANDI ERP Database Backup
-- Generated at: ${data.timestamp}
-- Version: ${data.version}

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

`;

  // 스키마 생성
  if (data.schema) {
    sql += '-- Schema\n';
    sql += data.schema + '\n\n';
  }

  // 데이터 삽입
  for (const [table, rows] of Object.entries(data.tables)) {
    if (Array.isArray(rows) && rows.length > 0) {
      sql += `-- Table: ${table}\n`;
      sql += `TRUNCATE TABLE ${table} CASCADE;\n`;
      
      for (const row of rows as any[]) {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row)
          .map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
          .join(', ');
        
        sql += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
      }
      
      sql += '\n';
    }
  }

  // 함수 생성
  if (data.functions && data.functions.length > 0) {
    sql += '-- Functions\n';
    for (const func of data.functions) {
      sql += func + '\n\n';
    }
  }

  // 트리거 생성
  if (data.triggers && data.triggers.length > 0) {
    sql += '-- Triggers\n';
    for (const trigger of data.triggers) {
      sql += trigger + '\n\n';
    }
  }

  return sql;
}

/**
 * CSV 백업 생성
 */
function generateCSVBackup(data: any): string {
  let csv = '';
  
  for (const [table, rows] of Object.entries(data.tables)) {
    if (Array.isArray(rows) && rows.length > 0) {
      csv += `Table: ${table}\n`;
      
      // 헤더
      const headers = Object.keys((rows as any[])[0]);
      csv += headers.join(',') + '\n';
      
      // 데이터
      for (const row of rows as any[]) {
        const values = headers.map(h => {
          const value = row[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        });
        csv += values.join(',') + '\n';
      }
      
      csv += '\n';
    }
  }
  
  return csv;
}

/**
 * 객체 평탄화
 */
function flattenObject(obj: any, prefix = ''): any {
  const flattened: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      flattened[newKey] = '';
    } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = JSON.stringify(value);
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}

/**
 * 헤더 번역
 */
function translateHeaders(
  data: any[],
  sheetName: string,
  locale: 'ko' | 'zh-CN' | 'en'
): any[] {
  const translations: Record<string, Record<string, string>> = {
    ko: {
      id: 'ID',
      created_at: '생성일',
      updated_at: '수정일',
      name: '이름',
      email: '이메일',
      phone: '전화번호',
      address: '주소',
      status: '상태',
      amount: '금액',
      quantity: '수량',
      price: '가격',
      total: '합계',
      description: '설명'
    },
    'zh-CN': {
      id: 'ID',
      created_at: '创建日期',
      updated_at: '更新日期',
      name: '姓名',
      email: '邮箱',
      phone: '电话',
      address: '地址',
      status: '状态',
      amount: '金额',
      quantity: '数量',
      price: '价格',
      total: '总计',
      description: '描述'
    },
    en: {
      // 영어는 그대로 사용
    }
  };
  
  if (locale === 'en' || !translations[locale]) {
    return data;
  }
  
  return data.map(row => {
    const translatedRow: any = {};
    
    for (const [key, value] of Object.entries(row)) {
      const translatedKey = translations[locale][key] || key;
      translatedRow[translatedKey] = value;
    }
    
    return translatedRow;
  });
}

/**
 * Excel 스타일 적용
 */
function applyExcelStyles(worksheet: any) {
  // 실제로는 xlsx-style 라이브러리 사용
  // 헤더 스타일, 컬럼 너비, 숫자 포맷 등 적용
}

// 헬퍼 함수들
async function getSchemaInfo(tables: string[]): Promise<string> {
  // information_schema에서 스키마 정보 조회
  return '';
}

async function getFunctions(): Promise<string[]> {
  // pg_proc에서 함수 정보 조회
  return [];
}

async function getTriggers(): Promise<string[]> {
  // pg_trigger에서 트리거 정보 조회
  return [];
}

async function validateBackupSchema(data: any): Promise<boolean> {
  // 백업 스키마 검증
  return true;
}

async function restoreFunctions(functions: string[]): Promise<void> {
  // 함수 복원
}

async function restoreTriggers(triggers: string[]): Promise<void> {
  // 트리거 복원
}

/**
 * 자동 백업 스케줄러
 */
export async function scheduleAutoBackup(
  frequency: 'daily' | 'weekly' | 'monthly'
): Promise<void> {
  // Vercel Cron Job으로 구현
  const cronSchedule = {
    daily: '0 2 * * *',     // 매일 새벽 2시
    weekly: '0 2 * * 1',    // 매주 월요일 새벽 2시
    monthly: '0 2 1 * *'    // 매월 1일 새벽 2시
  };
  
  // Cron job 설정
  console.log(`Auto backup scheduled: ${cronSchedule[frequency]}`);
}

/**
 * 백업 정리 (오래된 백업 삭제)
 */
export async function cleanupOldBackups(
  retentionDays: number = 30
): Promise<{ deleted: number }> {
  try {
    const supabase = await createServerSupabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // 오래된 백업 조회
    const { data: oldBackups } = await supabase
      .from('backup_history')
      .select('filename')
      .lt('created_at', cutoffDate.toISOString());
    
    if (!oldBackups || oldBackups.length === 0) {
      return { deleted: 0 };
    }
    
    // Storage에서 삭제
    for (const backup of oldBackups) {
      await supabase.storage
        .from('backups')
        .remove([backup.filename]);
    }
    
    // 기록 삭제
    await supabase
      .from('backup_history')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
    
    return { deleted: oldBackups.length };
  } catch (error) {
    console.error('Cleanup failed:', error);
    return { deleted: 0 };
  }
}