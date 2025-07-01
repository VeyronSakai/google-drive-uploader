import { jest } from '@jest/globals'
import type { Stats } from 'fs'
import type { Globber } from '@actions/glob'

jest.unstable_mockModule('fs', () => ({
  promises: {
    stat: jest.fn()
  },
  createReadStream: jest.fn()
}))

jest.unstable_mockModule('@actions/glob', () => ({
  create: jest.fn()
}))

const mockGoogleDriveService = {
  uploadFile: jest.fn<() => Promise<string>>(),
  createFolder: jest.fn<() => Promise<string>>()
}

jest.unstable_mockModule('../src/google-drive-service.js', () => ({
  GoogleDriveService: jest.fn(() => mockGoogleDriveService)
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
    } as unknown as Stats)

    mockGoogleDriveService.uploadFile.mockResolvedValue('file-123')

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
      } as unknown as Stats)
      .mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true
      } as unknown as Stats)

    const mockGlobber = {
      glob: jest
        .fn<() => Promise<string[]>>()
        .mockResolvedValue(['/folder/file1.txt', '/folder/file2.txt'])
    } as unknown as Globber
    ;(glob.create as jest.MockedFunction<typeof glob.create>).mockResolvedValue(
      mockGlobber
    )

    mockGoogleDriveService.createFolder.mockResolvedValue('folder-123')
    mockGoogleDriveService.uploadFile
      .mockResolvedValueOnce('file-1')
      .mockResolvedValueOnce('file-2')

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
