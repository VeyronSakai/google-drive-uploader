import * as core from '@actions/core'
import { Uploader } from './uploader.js'

export async function run(): Promise<void> {
  try {
    // Get inputs
    const credentials = core.getInput('credentials', { required: true })
    const parentFolderId = core.getInput('parent-folder-id', {
      required: true
    })
    const targetPath = core.getInput('path', { required: true })
    const customName = core.getInput('name')
    const overwrite = core.getBooleanInput('overwrite')
    const dryRun = core.getBooleanInput('dry-run')

    core.info(`Starting upload to Google Drive...`)
    core.info(`Target path: ${targetPath}`)
    core.info(`Parent folder ID: ${parentFolderId}`)
    if (customName) {
      core.info(`Custom name: ${customName}`)
    }
    core.info(`Overwrite: ${overwrite}`)
    core.info(`Dry run: ${dryRun}`)

    // Create uploader and perform upload
    const uploader = new Uploader(credentials, dryRun)
    const result = await uploader.upload(
      targetPath,
      parentFolderId,
      customName,
      overwrite
    )

    // Set outputs
    if (result.fileId) {
      core.setOutput('file-id', result.fileId)
    }

    if (result.folderId) {
      core.setOutput('folder-id', result.folderId)
    }

    core.setOutput('uploaded-files', JSON.stringify(result.uploadedFiles))

    core.info(
      `Upload completed successfully. ${result.uploadedFiles.length} file(s) uploaded.`
    )
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}
