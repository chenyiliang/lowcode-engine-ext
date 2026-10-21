import React, { PureComponent } from 'react';
import { Select } from '@alifd/next';
import type { DataSourceItem } from '@alifd/next/types/select';
import { project } from '@alilc/lowcode-engine';
import './index.less';

export interface PluginProps {
  value: string;
  onChange: any;
}

interface ClassNameViewProps extends PluginProps {
  /** 宿主可注入的取 schema 方法，缺省回落到 `project.exportSchema()` */
  getSchema?: () => any;
}

export default class ClassNameView extends PureComponent<ClassNameViewProps> {
  static display = 'ClassName';

  state = ClassNameView.deriveData(this.props);

  /**
   * 由 props 推导下拉数据源与选中值。
   *
   * 原实现放在 `componentWillMount` 里（React 19 已移除该生命周期），
   * 这里改成纯推导函数：既用于构造初始 state（首屏就有正确数据，不闪空），
   * 也用于 onFocus 时的刷新。
   */
  static deriveData(props: ClassNameViewProps) {
    const schema = props.getSchema?.() || project.exportSchema();
    const css = schema.componentsTree[0]?.css;
    const classNameList: string[] =
      css?.match(/(?<=((?<!([\d\w_-]+))\.))[\w-_\d]+(?=\s*([{,])?)/g) || [];

    const dataSource: Array<{ label: string; value: string }> = classNameList.map((item) => ({
      value: item,
      label: item,
    }));

    const selectValue = props.value?.split?.(' ') || [];
    selectValue.forEach((current) => {
      if (!classNameList.some((cls) => cls === current)) {
        dataSource.push({
          value: current,
          label: current,
        });
      }
    });

    return { dataSource, selectValue: selectValue as string[] };
  }

  setClassNameSetterData = () => {
    this.setState(ClassNameView.deriveData(this.props));
  };

  // 多选模式下 Fusion 回传 DataSourceItem[]，窄化成字符串数组
  handleChange = (value: DataSourceItem | DataSourceItem[]) => {
    const { onChange } = this.props;
    const selected = (Array.isArray(value) ? value : [value]).map((item) => String(item));
    onChange(selected.join(' '));
    this.setState({
      selectValue: selected,
    });
  };

  render() {
    const { dataSource, selectValue } = this.state;
    return (
      <Select
        className='ClassNameSetter_Select'
        style={{ width: '100%' }}
        mode="multiple"
        dataSource={dataSource}
        onFocus={this.setClassNameSetterData}
        onChange={this.handleChange}
        value={selectValue}
      />
    );
  }
}
