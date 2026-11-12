# DSH 液态玻璃

DSH Web 外观插件。安装后在「设置 → 液态玻璃」即时调节玻璃材质，设置保存在当前浏览器。「恢复默认」会恢复原先使用的配置。

## 安装

```sh
dsh plugin --profile web add https://github.com/hh5631/dsh-liquid-glass/releases/latest/download/dsh-liquid-glass.tgz
```

需要 Node.js 22+ 和 DSH Web `>=0.2.2-rc.1 <0.3.0-0`。文件查看器的路径栏和文件树使用 DSH 主题底色。

内置默认值来自本机原有设置。玻璃釉色为 `#f3fbf7`，对话栏为 `#fffcf5`，雾化 8 px，透明度 42%，全局保真度 90%，对话栏保真度 75%，两侧圆角 20 px。

客户端使用 DSH 的设置插槽与原生主题，沿用 [Wallpaper Engine 1.4.2](https://github.com/elysia395/dsh-wallpaper-engine/tree/v1.4.2) 的玻璃样式及颜色计算，授权见 [MIT 许可证](LICENSE)。宿主入口为空壳，客户端按页面变化更新侧栏和设置窗的玻璃表面。

DSH 的客户端加载器使用单文件入口。`lib/client.js` 开头定义默认配置，末尾内联玻璃样式和设置页样式。
