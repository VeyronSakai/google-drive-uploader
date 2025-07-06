import * as fs from 'fs'
import * as path from 'path'
import * as glob from '@actions/glob'
import { GoogleDriveService } from './google-drive-service.js'
import * as core from '@actions/core'
import mime from 'mime-types'

export interface UploadResult {
  fileId?: string
  folderId?: string
  uploadedFiles: Array<{
    path: string
    id: string
    name: string
  }>
}

export interface UploaderOptions {
  credentials?: string
  workloadIdentityProvider?: string
  serviceAccount?: string
  dryRun?: boolean
}

export class Uploader {
  private driveService: GoogleDriveService

  constructor(options: UploaderOptions) {
    this.driveService = new GoogleDriveService(options)
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
    const mimeType = mime.lookup(filePath)
    return mimeType || 'application/octet-stream'
  }
}
