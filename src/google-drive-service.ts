import { google, drive_v3 } from 'googleapis'

export class GoogleDriveService {
  private drive: drive_v3.Drive | null
  private readonly dryRun: boolean

  constructor(credentials: string, dryRun = false) {
    this.dryRun = dryRun

    if (!dryRun) {
      const credentialsJson = JSON.parse(
        Buffer.from(credentials, 'base64').toString('utf-8')
      )

      const auth = new google.auth.GoogleAuth({
        credentials: credentialsJson,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      })

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
}
