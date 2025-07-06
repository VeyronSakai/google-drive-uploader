import * as fs from 'fs'
import * as path from 'path'
import * as glob from '@actions/glob'
import { GoogleDriveService } from './google-drive-service.js'
import * as core from '@actions/core'

export interface UploadResult {
  fileId?: string
  folderId?: string
  uploadedFiles: Array<{
    path: string
    id: string
    name: string
  }>
}

export class Uploader {
  private driveService: GoogleDriveService

  constructor(credentials: string, dryRun = false) {
    this.driveService = new GoogleDriveService(credentials, dryRun)
  }

  async upload(
    targetPath: string,
    parentFolderId: string,
    customName?: string,
    overwrite = false
  ): Promise<UploadResult> {
    const result: UploadResult = {
      uploadedFiles: []
    }

    const stats = await fs.promises.stat(targetPath)

    if (stats.isDirectory()) {
      // Upload folder
      const folderName = customName || path.basename(targetPath)
      const folderId = await this.driveService.createFolder(
        folderName,
        parentFolderId
      )
      result.folderId = folderId

      // Upload all files in the folder
      const globber = await glob.create(`${targetPath}/**/*`, {
        followSymbolicLinks: false
      })
      const files = await globber.glob()

      for (const file of files) {
        const fileStats = await fs.promises.stat(file)
        if (fileStats.isFile()) {
          const relativePath = path.relative(targetPath, file)
          const fileId = await this.uploadFileWithFolderStructure(
            file,
            relativePath,
            folderId,
            overwrite
          )
          result.uploadedFiles.push({
            path: relativePath,
            id: fileId,
            name: path.basename(file)
          })
          core.info(`Uploaded: ${relativePath} -> ${fileId}`)
        }
      }
    } else {
      // Upload single file
      const fileName = customName || path.basename(targetPath)
      const mimeType = this.getMimeType(targetPath)
      const fileContent = fs.createReadStream(targetPath)

      const fileId = await this.driveService.uploadFile(
        targetPath,
        fileName,
        mimeType,
        parentFolderId,
        fileContent,
        overwrite
      )

      result.fileId = fileId
      result.uploadedFiles.push({
        path: targetPath,
        id: fileId,
        name: fileName
      })
      core.info(`Uploaded: ${fileName} -> ${fileId}`)
    }

    return result
  }

  private async uploadFileWithFolderStructure(
    filePath: string,
    relativePath: string,
    parentFolderId: string,
    overwrite: boolean
  ): Promise<string> {
    const pathParts = relativePath.split(path.sep)
    const fileName = pathParts.pop()!

    // Create folder structure
    let currentParentId = parentFolderId
    for (const folderName of pathParts) {
      currentParentId = await this.driveService.createFolder(
        folderName,
        currentParentId
      )
    }

    // Upload file
    const mimeType = this.getMimeType(filePath)
    const fileContent = fs.createReadStream(filePath)

    return await this.driveService.uploadFile(
      filePath,
      fileName,
      mimeType,
      currentParentId,
      fileContent,
      overwrite
    )
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime'
    }

    return mimeTypes[ext] || 'application/octet-stream'
  }
}
