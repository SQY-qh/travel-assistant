# 密钥目录

请将你自己的 API Key 放在这个目录中，不要提交到公开仓库。

- `gpt.env.example`：GPT 相关变量示例
- `amap.env.example`：高德地图变量示例
- `local.keys.env.example`：本地统一密钥文件示例
- `local.keys.env`：你真实使用的本地密钥文件，已经被 `.gitignore` 忽略

建议流程：

1. 复制 `local.keys.env.example` 为 `local.keys.env`
2. 填入你自己的 `VITE_GPT_API_KEY`
3. 高德地图建议分别填写：
   - `VITE_AMAP_API_KEY`：Web 端 JS API Key
   - `VITE_AMAP_SECURITY_JS_CODE`：JS 安全密钥
   - `VITE_AMAP_WEBSERVICE_KEY`：Web 服务 Key（用于地理编码、POI 搜索、后端校验）
4. 若要启用真实航班 / 酒店报价，请额外填写后端专用的：
   - `AMADEUS_API_KEY`
   - `AMADEUS_API_SECRET`
   - `AMADEUS_BASE_URL`：默认可用 `https://test.api.amadeus.com`
5. 重新执行 `npm run dev` 与 `npm run dev:telemetry`
