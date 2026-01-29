/**
 * Spreadsheet to CSV Converter
 * Converts Excel (.xls, .xlsx) and OpenDocument (.ods) to CSV for Gemini API
 */

import * as XLSX from 'xlsx';

/**
 * Convert a spreadsheet file to CSV format
 * Combines all sheets into a single CSV with sheet separators
 * @param file - The spreadsheet file to convert
 * @returns CSV file blob
 */
export async function convertSpreadsheetToCSV(file: File): Promise<File> {
    // Read the file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse the spreadsheet
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // If only one sheet, convert directly
    if (workbook.SheetNames.length === 1) {
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        // Create new CSV file
        const csvBlob = new Blob([csv], { type: 'text/csv' });
        const csvFile = new File([csvBlob], file.name.replace(/\.(xls|xlsx|ods)$/i, '.csv'), { 
            type: 'text/csv' 
        });
        
        return csvFile;
    }
    
    // Multiple sheets: combine with sheet name headers
    let combinedCSV = '';
    
    for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i];
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        // Add sheet separator
        if (i > 0) {
            combinedCSV += '\n\n';
        }
        
        // Add sheet name header
        combinedCSV += `### Sheet: ${sheetName} ###\n`;
        combinedCSV += csv;
    }
    
    // Create new CSV file with combined data
    const csvBlob = new Blob([combinedCSV], { type: 'text/csv' });
    const csvFile = new File([csvBlob], file.name.replace(/\.(xls|xlsx|ods)$/i, '.csv'), { 
        type: 'text/csv' 
    });
    
    return csvFile;
}

/**
 * Convert spreadsheet ArrayBuffer to CSV string
 * Used for server-side conversion
 * @param buffer - ArrayBuffer of spreadsheet file
 * @param originalFilename - Original filename for proper naming
 * @returns Object with CSV data and filename
 */
export function convertSpreadsheetBufferToCSV(
    buffer: ArrayBuffer, 
    originalFilename: string
): { csvData: string; filename: string } {
    // Parse the spreadsheet
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // If only one sheet, convert directly
    if (workbook.SheetNames.length === 1) {
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        return {
            csvData: csv,
            filename: originalFilename.replace(/\.(xls|xlsx|ods)$/i, '.csv')
        };
    }
    
    // Multiple sheets: combine with sheet name headers
    let combinedCSV = '';
    
    for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i];
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        // Add sheet separator
        if (i > 0) {
            combinedCSV += '\n\n';
        }
        
        // Add sheet name header
        combinedCSV += `### Sheet: ${sheetName} ###\n`;
        combinedCSV += csv;
    }
    
    return {
        csvData: combinedCSV,
        filename: originalFilename.replace(/\.(xls|xlsx|ods)$/i, '.csv')
    };
}
