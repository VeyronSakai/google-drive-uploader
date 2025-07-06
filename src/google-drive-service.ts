import { google, drive_v3 } from 'googleapis'
import { GoogleAuth } from 'google-auth-library'

export interface GoogleDriveServiceOptions {
  credentials?: string
  workloadIdentityProvider?: string
  serviceAccount?: string
  dryRun?: boolean
}

export class GoogleDriveService {
  private drive: drive_v3.Drive | null
  private readonly dryRun: boolean

  constructor(options: GoogleDriveServiceOptions) {
    this.dryRun = options.dryRun || false

    if (!this.dryRun) {
      let auth: GoogleAuth

      if (options.credentials) {
        // Use service account credentials
        const credentialsJson = JSON.parse(
          Buffer.from(options.credentials, 'base64').toString('utf-8')
        )

        auth = new google.auth.GoogleAuth({
          credentials: credentialsJson,
          scopes: ['https://www.googleapis.com/auth/drive.file']
        })
      } else if (options.workloadIdentityProvider && options.serviceAccount) {
        // Use Workload Identity Federation
        auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/drive.file'],
          // The GoogleAuth library will automatically use the environment variables:
          // GOOGLE_APPLICATION_CREDENTIALS or
          // Workload Identity metadata when running in a GitHub Actions environment
          projectId: 'auto',
          // For Workload Identity, we need to specify the service account to impersonate
          clientOptions: {
            subject: options.serviceAccount
          }
        })
      } else {
        throw new Error(
          'Either credentials or workload identity configuration must be provided'
        )
      }

      this.drive = google.drive({ version: 'v3', auth })
    } else {
      this.drive = null
    }
  }

  async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    parentFolderId: string,
    fileContent: Buffer | NodeJS.ReadableStream,
    overwrite = false
  ): Promise<string> {
    if (this.dryRun) {
      console.log(
        `[DRY RUN] Would upload file: ${fileName} to folder: ${parentFolderId}`
      )
      return `dry-run-file-${Date.now()}`
    }

    if (overwrite) {
      const existingFile = await this.findFileByName(fileName, parentFolderId)
      if (existingFile) {
        await this.updateFile(existingFile.id!, fileName, fileContent)
        return existingFile.id!
      }
    }

    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: [parentFolderId]
    }

    const media = {
      mimeType,
      body: fileContent
    }

    const response = await this.drive!.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id'
    })

    return response.data.id!
  }

  async createFolder(
    folderName: string,
    parentFolderId: string
  ): Promise<string> {
    if (this.dryRun) {
      console.log(
        `[DRY RUN] Would create folder: ${folderName} in parent: ${parentFolderId}`
      )
      return `dry-run-folder-${Date.now()}`
    }

    // Check if folder already exists
    const existingFolder = await this.findFolderByName(
      folderName,
      parentFolderId
    )
    if (existingFolder) {
      return existingFolder.id!
    }

    const fileMetadata: drive_v3.Schema$File = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    }

    const response = await this.drive!.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    })

    return response.data.id!
  }

  private async findFileByName(
    fileName: string,
    parentFolderId: string
  ): Promise<drive_v3.Schema$File | null> {
    if (this.dryRun) {
      console.log(
        `[DRY RUN] Would search for file: ${fileName} in parent: ${parentFolderId}`
      )
      return null
    }

    const query = `name='${fileName}' and '${parentFolderId}' in parents and trashed=false`
    const response = await this.drive!.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    })

    return response.data.files?.[0] || null
  }

  private async updateFile(
    fileId: string,
    fileName: string,
    fileContent: Buffer | NodeJS.ReadableStream
  ): Promise<void> {
    if (this.dryRun) {
      console.log(`[DRY RUN] Would update file: ${fileName} with id: ${fileId}`)
      return
    }

    await this.drive!.files.update({
      fileId,
      requestBody: {
        name: fileName
      },
      media: {
        body: fileContent
      }
    })
  }

  private async findFolderByName(
    folderName: string,
    parentFolderId: string
  ): Promise<drive_v3.Schema$File | null> {
    if (this.dryRun) {
      console.log(
        `[DRY RUN] Would search for folder: ${folderName} in parent: ${parentFolderId}`
      )
      return null
    }

    const query = `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    const response = await this.drive!.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    })

    return response.data.files?.[0] || null
  }
}
