import SparkMD5 from 'spark-md5'

export async function createUploadTasks(handles) {
  let uploadTask = []
  for (let handle of handles) {
    // 判断文件大小是否大于20M，大于使用分片上传
    const file = handle.getFile()
    if (file.size > 1024 * 1024 * 20) {
      // 大于200M 使用分片上传
      const splitInfo = await spiltFile(file)
      const task = new MultipartTask({ ...splitInfo, path: handle.path, name: handle.name })
      uploadTask.push(task)
    } else {
      // 小于200M 使用单文件上传
      const file = handle.file
      const fileInfo = {
        fileId: SparkMD5.ArrayBuffer.hash(file),
        ext: getExtName(file.name),
        path: handle.path,
        name: handle.name,
        file: handle.getFile(),
      }
      const task = new SingleTask(fileInfo)
      uploadTask.push(task)
    }
  }
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
  #fileInfo

  constructor(fileInfo) {
    this.#paused = true
    this.#fileInfo = fileInfo
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
  start(updateFn, callback) {
    this.#paused = false
    this.#upload(this.#fileInfo, this.#needs, updateFn, callback)
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
   * @param fileInfo
   * @returns {Promise<any>}
   */
  handShake(fileInfo) {
    return fetch('http://localhost:8000/api/upload/multipart/handshake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: fileInfo.fileId,
        ext: fileInfo.ext,
        chunkIds: fileInfo.chunks.map((it) => it.id),
      }),
    }).then((resp) => resp.json())
  }

  /**
   * 上传文件
   * @param fileInfo {{fileId: string,ext: string,chunks:Blob[],time: number}}
   * @param needs
   * @param updateFn
   * @param callback
   * @returns {Promise<void>}
   */
  async #upload(fileInfo, needs, updateFn = (progress) => null, callback = () => null) {
    console.log(`请求前：${needs}`)
    // debugger
    // 如果没有传入 needs 或者 paused 直接停止
    if (!needs || this.#paused) {
      return
    }
    // 如果 needs长度为0 说明已经把所有分片都上传了，调用回调
    if (needs.length === 0) {
      callback()
      return
    }
    // 下一个要上传的 块
    const nextChunkId = needs[0]
    // 从chunks中找到这个块
    const file = fileInfo.chunks.find((it) => it.id === nextChunkId)
    const formData = new FormData()
    formData.append('chunkId', nextChunkId)
    formData.append('fileId', fileInfo.fileId)
    formData.append('file', file.content)
    const resp = await fetch('http://localhost:8000/api/upload/multipart', {
      method: 'POST',
      body: formData,
    }).then((resp) => resp.json())
    // 更新 needs
    needs = resp.data
    console.log(`请求后：${needs}`)
    // await 可以将异步的代码当作同步代码来执行, 所以这里实现了sleep的效果
    await new Promise((resolve) => setTimeout(resolve, 500))
    // 更新进度
    const progress = (1 - needs.length / fileInfo.chunks.length) * 100
    updateFn(progress)
    await this.#upload(fileInfo, needs, updateFn, callback)
  }
}

/**
 * 小文件秒传
 */
export class SingleTask {
  #fileInfo;

  constructor(fileInfo) {
    this.#fileInfo = fileInfo;
  }

  /**
   * 携带文件信息和文件二进制，直接上传，无法暂停，获取上传进度等等操作
   */
  async upload() {

  }
}
