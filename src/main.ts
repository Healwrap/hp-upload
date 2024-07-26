import SparkMD5 from 'spark-md5'

/**
 * 上传链接管理
 */
export let uploadConfig = {
  multipart: {
    handleShake: 'http://localhost:8000/api/upload/multipart/handshake',
    upload: 'http://localhost:8000/api/upload/multipart',
  },
  single: {
    upload: 'http://localhost:8000/api/upload/single',
  },
}

/**
 * 设置上传配置
 * @param config
 */
export function setUploadConfig(config) {
  uploadConfig = config
}

/**
 * 创建上传任务
 * @param handles
 * @return uploadTask 返回任务列表
 */
export async function createUploadTasks(handles) {
  let uploadTask = []
  for (let handle of handles) {
    // 判断文件大小是否大于20M，大于使用分片上传
    const file = await handle.getFile()
    if (file.size > 1024 * 1024 * 20) {
      // 大于20M 使用分片上传
      const splitInfo = await spiltFile(file)
      const task = new MultipartTask({ ...splitInfo, path: handle.path, name: handle.name })
      uploadTask.push(task)
    } else {
      // 小于20M 使用单文件上传
      const file = await handle.getFile()
      const fileInfo = {
        fileId: SparkMD5.ArrayBuffer.hash(file),
        ext: getExtName(file.name),
        path: handle.path,
        name: handle.name,
        file: file,
      }
      const task = new SingleTask(fileInfo)
      uploadTask.push(task)
    }
  }
  return uploadTask
}

/**
 * 获取文件的后缀名
 * @param filename
 */
function getExtName(filename) {
  const i = filename.lastIndexOf('.')
  if (i < 0) {
    return ''
  }
  return filename.substr(i)
}

/**
 * 对文件进行分片操作
 * @param file
 * @returns {Promise<{fileId: string,ext: string,chunks:Blob[],time:number}>}
 */
function spiltFile(file) {
  return new Promise<{ fileId: string; ext: string; chunks: Blob[]; time: number }>((resolve) => {
    /**
     * 读取下一个分片
     */
    function _loadNext() {
      const start = chunkIndex * chunkSize,
        end = start + chunkSize >= file.size ? file.size : start + chunkSize
      fileReader.readAsArrayBuffer(file.slice(start, end))
    }

    const currentTime = new Date().getTime()
    // 分片尺寸（2M）
    const chunkSize = 1024 * 1024 * 2
    // 分片数量
    const chunkCount = Math.ceil(file.size / chunkSize)
    // 当前chunk的下标
    let chunkIndex = 0
    // 使用ArrayBuffer完成文件MD5编码
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader() // 文件读取器
    const chunks = [] // 分片信息数组
    // 读取第一个分片
    _loadNext()
    // 读取一个分片后的回调
    fileReader.onload = function (e) {
      spark.append(e.target.result as ArrayBuffer) // 分片数据追加到MD5编码器中
      // 当前分片单独的MD5
      const chunkMD5 = SparkMD5.ArrayBuffer.hash(e.target.result as ArrayBuffer) + chunkIndex
      chunkIndex++
      chunks.push({
        id: chunkMD5,
        content: new Blob([e.target.result]),
      })
      if (chunkIndex < chunkCount) {
        _loadNext() // 继续读取下一个分片
      } else {
        // 读取完成
        const fileId = spark.end()
        const endTime = new Date().getTime()
        resolve({
          fileId,
          ext: getExtName(file.name),
          chunks,
          time: endTime - currentTime,
        })
      }
    }
  })
}

/**
 * 大文件分片上传，支持获取上传进度、断点续传等功能
 */
export class MultipartTask {
  #paused
  #needs
  fileInfo

  constructor(fileInfo) {
    this.#paused = true
    this.fileInfo = fileInfo
  }

  /**
   * 暂停上传
   */
  pause() {
    this.#paused = true
  }

  /**
   * 开始上传
   * @param updateFn
   * @param callback
   */
  async start(updateFn, callback) {
    // 这里第一次启动上传，会握手，暂停恢复之后也会握手检查上传进度
    if (this.#paused) {
      this.#paused = false
      await this.handShake()
    }
    await this.#upload(updateFn, callback)
  }

  /**
   * 获取当前上传状态
   * @returns {*}
   */
  getState() {
    return this.#paused
  }

  /**
   * 与后端握手，获取文件上传进度
   * @returns {Promise<any>}
   */
  async handShake() {
    const chunkIds = this.fileInfo.chunks.map((it) => it.id)
    const res = await fetch(uploadConfig.multipart.handleShake, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: this.fileInfo.fileId,
        name: this.fileInfo.name,
        path: this.fileInfo.path,
        ext: this.fileInfo.ext,
        chunkIds: chunkIds,
      }),
    }).then((resp) => resp.json())
    if (res.data) {
      this.#needs = res.data
    }
    this.#needs = chunkIds
  }

  /**
   * 上传文件的实现
   * @param updateFn
   * @param callback
   * @returns {Promise<void>}
   */
  async #upload(updateFn = (progress) => null, callback = () => null) {
    // 如果没有传入 needs 或者 paused 直接停止
    if (!this.#needs || this.#paused) {
      return
    }
    // 如果 needs长度为0 说明已经把所有分片都上传了，调用回调
    if (this.#needs.length === 0) {
      callback()
      return
    }
    // 下一个要上传的 块
    const nextChunkId = this.#needs[0]
    // 从chunks中找到这个块
    const file = this.fileInfo.chunks.find((it) => it.id === nextChunkId)
    const formData = new FormData()
    formData.append('chunkId', nextChunkId)
    formData.append('fileId', this.fileInfo.fileId)
    formData.append('file', file.content)
    const resp = await fetch(uploadConfig.multipart.upload, {
      method: 'POST',
      body: formData,
    }).then((resp) => resp.json())
    // 更新 needs
    this.#needs = resp.data
    // 更新进度
    const progress = (1 - this.#needs.length / this.fileInfo.chunks.length) * 100
    updateFn(progress)
    await this.#upload(updateFn, callback)
  }
}

/**
 * 小文件秒传
 */
export class SingleTask {
  fileInfo
  #controller

  constructor(fileInfo) {
    this.fileInfo = fileInfo
    this.#controller = new AbortController()
  }

  /**
   * 携带文件信息和文件二进制，直接上传，无法暂停，获取上传进度等等操作
   */
  async start() {
    await this.#upload()
  }

  /**
   * 取消上传（删除任务）
   */
  abort() {
    this.#controller.abort()
  }

  /**
   * 上传操作的实现
   */
  async #upload() {
    const formData = new FormData()
    formData.append('file', this.fileInfo.file)
    formData.append('ext', this.fileInfo.ext)
    formData.append('path', this.fileInfo.path)
    formData.append('name', this.fileInfo.name)
    formData.append('fileId', this.fileInfo.fileId)
    await fetch(uploadConfig.single.upload, {
      method: 'POST',
      body: formData,
      signal: this.#controller.signal,
    }).then((resp) => resp.json())
  }
}
