/**
 * 发起请求，这里主要是用作上传文件，封装获取上传进度的功能
 * @author pepedd864
 * @date 2024/7/30
 */
export type RequestOptions = {
  url: string
  method?: string
  headers?: HeadersInit;
  onProgress?: (loaded: number, total: number) => void
  onUploadProgress?: (loaded: number, total: number) => void
  data?: any,
}
export default function request<T>(options: RequestOptions) {
  const { url, method = "GET", headers, data, onProgress, onUploadProgress } = options;
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    // 默认即开启跨域
    // xhr.withCredentials = true;
    // 设置请求头
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }
    xhr.addEventListener("readystatechange", (e) => {
      // 请求成功结果
      if (xhr.readyState === xhr.DONE) {
        resolve(xhr.response);
      }
    });
    xhr.addEventListener("error", (e) => {
      // 请求失败结果
      reject(e);
    });
    // 下载进度
    xhr.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        // e.loaded, e.total 均为字节单位，转换为常见的MB为 e.loaded * 1024 * 1024
        onProgress && onProgress(e.loaded, e.total);
      }
    });
    // 上传进度
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onUploadProgress && onUploadProgress(e.loaded, e.total);
      }
    });
    // 发起请求
    xhr.send(data);
  });
}
