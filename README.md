### @alilc/lowcode-engine-ext

### 简介
lowcode-engine-ext 是阿里低代码引擎官方提供的 setter 和 setter 必须依赖的插件集合

setter(设置器) 是用来展示每个物料的属性，[setter使用说明手册](https://www.yuque.com/lce/doc/cl03wo_nmhznb) [官方setter列表说明](https://www.yuque.com/lce/doc/oc220p#fl46)

### 使用方式

本包用 Vite 库模式构建，产物为 ESM / CJS + 独立样式文件（不再产出老的 UMD `dist/js/engine-ext.js`）：

| 产物 | 路径 | exports 别名 |
|---|---|---|
| ESM | `dist/index.mjs` | `@alilc/lowcode-engine-ext` |
| CJS | `dist/index.cjs` | `@alilc/lowcode-engine-ext`（require） |
| 类型 | `dist/index.d.ts` | — |
| 本包样式 | `dist/index.css` | `@alilc/lowcode-engine-ext/style.css` |
| Fusion 主题样式（可选） | `dist/fusion.css` | `@alilc/lowcode-engine-ext/fusion.css` |

```ts
import engineExt from '@alilc/lowcode-engine-ext';
// 本仓库 setter 自身的样式（含对 .next-* 的覆盖）
import '@alilc/lowcode-engine-ext/style.css';
// 可选：若宿主没有通过 CDN / 主题包引入 Fusion 主题，再引这一份
// import '@alilc/lowcode-engine-ext/fusion.css';

const { setters, setterMap, pluginMap } = engineExt;
```

> 说明：老构建栈用 `build-plugin-fusion-css` 把 Fusion 组件样式打进 `dist/css/engine-ext.css`。
> 迁到 Vite 后 `@alifd/next` 是 external（且为 peerDependency），Fusion 样式不再随 JS 进来。
> `dist/index.css` 只含本仓库 34 个 less/scss；`dist/fusion.css` 是 `@alifd/theme-lowcode-light`
> 的预编译主题（`variables.css` + `next.var.min.css`）。现有 demo 均通过 CDN 引主题，可不引 `fusion.css`。


#### 拓展变量绑定面板

通过传入extraDataMap拓展属性绑定面板

```typescript
ctx.skeleton.add({
  area: 'centerArea',
  type: 'Widget',
  content: pluginMap.VariableBindDialog,
  name: 'variableBindDialog',
  props: {
    getSchema: () => editorController.getSchema(),
    // 拓展变量绑定
    extraDataMap: {
      props: {
        name: 'Props', // 变量组展示名
        key: 'props', // 属性名，例如 this.props
        getChildren: () => [
          {
            label: 'prop1',
            value: 'value1',
          },
          {
            label: 'prop2',
            children: [
              { label: 'propxxx', value: 1 }
            ]
          }
        ],
      }
    }
  },
});
```
