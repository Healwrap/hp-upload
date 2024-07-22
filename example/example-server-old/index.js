const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const port = require('./config').port;

// 启用CORS，允许所有跨域请求
app.use(cors());

// 配置静态文件目录，用于提供上传的文件
app.use('/upload', express.static(path.join(__dirname, './file')));

// 支持解析表单数据，包括multipart/form-data，用于处理文件上传
app.use(express.urlencoded({ extended: true }));

// 支持解析JSON格式的数据
app.use(express.json());

// 定义路由，处理文件下载请求
app.get('/download/:filename', (req, res) => {
  // 构建要下载文件的完整路径
  const filename = path.join(__dirname, './res', req.params.filename);
  // 发送文件下载
  res.download(filename, req.params.filename);
});

// 引入上传处理模块，挂载到/api/upload路由
app.use('/api/upload', require('./uploader'));

// 启动服务器监听指定端口
app.listen(port, () => {
  console.log(`server listen on ${port}`);
});
