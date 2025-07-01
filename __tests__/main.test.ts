import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

// Create a shared mock instance
const createMockUploader = () => ({
  upload: jest.fn<
    () => Promise<{
      fileId?: string
      folderId?: string
      uploadedFiles: Array<{ path: string; id: string; name: string }>
    }>
  >()
})

let currentMockUploader = createMockUploader()

jest.unstable_mockModule('../src/uploader.js', () => ({
  Uploader: jest.fn(() => currentMockUploader)
}))

const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Create a fresh mock for each test
    currentMockUploader = createMockUploader()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('uploads a file successfully', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'credentials':
          return 'base64-encoded-credentials'
        case 'parent-folder-id':
          return 'folder-123'
        case 'path':
          return '/path/to/file.txt'
        case 'name':
          return ''
        default:
          return ''
      }
    })

    core.getBooleanInput.mockReturnValue(false)

    const mockUploadResult = {
      fileId: 'file-abc123',
      uploadedFiles: [
        {
          path: '/path/to/file.txt',
          id: 'file-abc123',
          name: 'file.txt'
        }
      ]
    }

    currentMockUploader.upload.mockResolvedValue(mockUploadResult)

    await run()

    expect(currentMockUploader.upload).toHaveBeenCalledWith(
      '/path/to/file.txt',
      'folder-123',
      '',
      false
    )

    expect(core.setOutput).toHaveBeenCalledWith('file-id', 'file-abc123')
    expect(core.setOutput).toHaveBeenCalledWith(
      'uploaded-files',
      JSON.stringify(mockUploadResult.uploadedFiles)
    )
    expect(core.info).toHaveBeenCalledWith(
      'Upload completed successfully. 1 file(s) uploaded.'
    )
  })

  it('uploads a folder successfully', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'credentials':
          return 'base64-encoded-credentials'
        case 'parent-folder-id':
          return 'folder-123'
        case 'path':
          return '/path/to/folder'
        case 'name':
          return 'custom-folder-name'
        default:
          return ''
      }
    })

    core.getBooleanInput.mockReturnValue(true)

    const mockUploadResult = {
      folderId: 'folder-xyz789',
      uploadedFiles: [
        {
          path: 'file1.txt',
          id: 'file-1',
          name: 'file1.txt'
        },
        {
          path: 'subfolder/file2.txt',
          id: 'file-2',
          name: 'file2.txt'
        }
      ]
    }

    currentMockUploader.upload.mockResolvedValue(mockUploadResult)

    await run()

    expect(currentMockUploader.upload).toHaveBeenCalledWith(
      '/path/to/folder',
      'folder-123',
      'custom-folder-name',
      true
    )

    expect(core.setOutput).toHaveBeenCalledWith('folder-id', 'folder-xyz789')
    expect(core.setOutput).toHaveBeenCalledWith(
      'uploaded-files',
      JSON.stringify(mockUploadResult.uploadedFiles)
    )
  })

  it('handles missing credentials error', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'credentials':
          return ''
        default:
          return ''
      }
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'Google Drive credentials are required'
    )
  })

  it('handles missing parent folder ID error', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'credentials':
          return 'base64-encoded-credentials'
        case 'parent-folder-id':
          return ''
        default:
          return ''
      }
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Parent folder ID is required')
  })

  it('handles missing path error', async () => {
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'credentials':
          return 'base64-encoded-credentials'
        case 'parent-folder-id':
          return 'folder-123'
        case 'path':
          return ''
        default:
          return ''
      }
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Path to upload is required')
  })
})
