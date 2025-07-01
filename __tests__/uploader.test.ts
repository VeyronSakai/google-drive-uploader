import { jest } from '@jest/globals'

jest.unstable_mockModule('fs', () => ({
  promises: {
    stat: jest.fn()
  },
  createReadStream: jest.fn()
}))

jest.unstable_mockModule('@actions/glob', () => ({
  create: jest.fn()
}))

jest.unstable_mockModule('../src/google-drive-service.js', () => ({
  GoogleDriveService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn(),
    createFolder: jest.fn()
  }))
}))

const fs = await import('fs')
const glob = await import('@actions/glob')

describe('Uploader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('uploads a single file', async () => {
    const mockStat = fs.promises.stat as jest.MockedFunction<
      typeof fs.promises.stat
    >
    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true
    })

    const { GoogleDriveService } = await import(
      '../src/google-drive-service.js'
    )
    const mockUploadFile = jest.fn().mockResolvedValue('file-123')
    ;(
      GoogleDriveService as unknown as jest.MockedClass<
        typeof GoogleDriveService
      >
    ).mockImplementation(() => ({
      uploadFile: mockUploadFile,
      createFolder: jest.fn()
    }))

    const { Uploader: UploaderClass } = await import('../src/uploader.js')
    const uploader = new UploaderClass('fake-credentials')

    const result = await uploader.upload(
      '/path/to/file.txt',
      'parent-folder-id',
      undefined,
      false
    )

    expect(result.fileId).toBe('file-123')
    expect(result.uploadedFiles).toHaveLength(1)
    expect(result.uploadedFiles[0]).toEqual({
      path: '/path/to/file.txt',
      id: 'file-123',
      name: 'file.txt'
    })
  })

  it('uploads a folder', async () => {
    const mockStat = fs.promises.stat as jest.MockedFunction<
      typeof fs.promises.stat
    >
    mockStat
      .mockResolvedValueOnce({
        isDirectory: () => true,
        isFile: () => false
      })
      .mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      })

    const mockGlobber = {
      glob: jest
        .fn()
        .mockResolvedValue(['/folder/file1.txt', '/folder/file2.txt'])
    }
    ;(glob.create as jest.MockedFunction<typeof glob.create>).mockResolvedValue(
      mockGlobber
    )

    const { GoogleDriveService } = await import(
      '../src/google-drive-service.js'
    )
    const mockCreateFolder = jest.fn().mockResolvedValue('folder-123')
    const mockUploadFile = jest
      .fn()
      .mockResolvedValueOnce('file-1')
      .mockResolvedValueOnce('file-2')
    ;(
      GoogleDriveService as unknown as jest.MockedClass<
        typeof GoogleDriveService
      >
    ).mockImplementation(() => ({
      uploadFile: mockUploadFile,
      createFolder: mockCreateFolder
    }))

    const { Uploader: UploaderClass } = await import('../src/uploader.js')
    const uploader = new UploaderClass('fake-credentials')

    const result = await uploader.upload(
      '/folder',
      'parent-folder-id',
      undefined,
      false
    )

    expect(result.folderId).toBe('folder-123')
    expect(result.uploadedFiles).toHaveLength(2)
  })
})
