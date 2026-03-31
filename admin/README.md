# 管理后台使用说明

## 启动方式

这是一个纯静态后台，可以用任意静态文件服务启动，例如：

```bash
cd "/Users/talexdreamsoul/Workspace/Projects/ink-moment/ink-moment/admin"
python3 -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173
```

## 默认 API 地址

页面默认请求：

```text
http://127.0.0.1:8787
```

如果你的 Cloudflare Worker 已部署到其他地址，请在页面右上角修改 `API 地址` 后保存。

## 首次使用

1. 打开页面后先查看系统状态。
2. 如果还没有超级管理员，使用“系统初始化”创建首个管理员账号。
3. 初始化完成后，使用管理员账号登录。
4. 登录后即可使用组织管理、打卡审核、反馈回复、通知下发和导出查询。
