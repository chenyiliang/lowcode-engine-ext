import React, { Component } from 'react';
import { Input, Search, Button, Icon } from '@alifd/next';
import { project } from '@alilc/lowcode-engine';
import './index.less';
import lang from './lang.json';

/** 单个语言的一条文案数据 */
interface I18nDataItem {
  langKey: string;
  i18nData: string;
}

/** 一个 i18n key 聚合出的多语言数据 */
interface I18nPageDataItem {
  i18nkey: string;
  i18nDataList: I18nDataItem[];
}

/** 组件内部维护的 i18n 值结构 */
interface I18nValue {
  type?: string;
  key?: string;
  i18nDataList?: I18nDataItem[];
  inputValue?: string;
}

/** 回写给引擎的 props 值：{ type, key, [langKey]: 文案 } */
interface I18nPropsValue {
  type?: string;
  key?: string;
  [langKey: string]: unknown;
}

/** 本组件只用到 field.editor.get('designer')，按实际使用面精确描述 */
interface I18nSetterField {
  editor: {
    get(key: string): any;
  };
}

interface I18nSetterProps {
  value?: I18nPropsValue;
  onChange: (value: I18nPropsValue) => void;
  field: I18nSetterField;
}

interface I18nSetterState {
  isShowSearchPopUp: boolean;
  isShowBindDataPopUp: boolean;
  i18nValue: I18nValue;
  i18nPageDataList?: I18nPageDataItem[];
  i18nSchema?: Record<string, Record<string, string>>;
  i18nSearchDataList?: I18nPageDataItem[];
  value?: string;
}

class I18nSetter extends Component<I18nSetterProps, I18nSetterState> {
  state: I18nSetterState = {
    isShowSearchPopUp: false,
    isShowBindDataPopUp: false,
    i18nValue: {},
  };

  componentDidMount() {
    // 获取schema
    const { value } = this.props;

    const schema = project.exportSchema();
    // schema.i18n 类型上是可选的。兜底成 {} 同时修掉一个既有运行时 bug：
    // 原代码用 JSON.stringify(i18nSchema) === '{}' 判断"i18n 结构为空"，
    // 但 undefined 时 JSON.stringify 返回 undefined 而非 '{}'，该分支永远不触发，
    // 中英默认文案就建不出来。
    const i18nSchema: Record<string, Record<string, string>> = schema.i18n ?? {};
    const i18nPageDataList = this.transfromI18nData(i18nSchema);
    let i18nValue: I18nValue = {};
    if (value && value.key) {
      i18nValue = this.setI18nValue(value.key, i18nPageDataList);
    }
    // 对原始的i18n数据结构进行转化，方便页面输出
    this.setState({
      i18nPageDataList: i18nPageDataList,
      i18nValue,
      i18nSchema,
    });
  }

  transfromI18nData = (
    i18nSchema: Record<string, Record<string, string>>,
  ): I18nPageDataItem[] => {
    const i18nPageDataList: I18nPageDataItem[] = [];
    for (const langKey in i18nSchema) {
      const i18nMap = i18nSchema[langKey];
      for (const key2 in i18nMap) {
        let matchFlag = false;
        i18nPageDataList.length > 0 &&
          i18nPageDataList.map((i18nItem) => {
            if (i18nItem.i18nkey == key2) {
              matchFlag = true;
              i18nItem.i18nDataList.push({
                langKey,
                i18nData: i18nMap[key2],
              });
            }
            return i18nItem;
          });

        if (!matchFlag) {
          const i18nItem: I18nPageDataItem = {
            i18nkey: key2,
            i18nDataList: [],
          };
          i18nItem.i18nDataList.push({
            langKey,
            i18nData: i18nMap[key2],
          });

          //i18nItem.i18nData[langKey] = i18nMap[key2]
          i18nPageDataList.push(i18nItem);
        }
      }
    }
    return i18nPageDataList;
  };

  onSearch(value?: string, filterValue?: string) {
    // console.log('onSearch', value, filterValue);
  }

  showSearchPopUp = () => {
    this.setState({
      isShowSearchPopUp: true,
    });
  };

  showBindDataPopUp = () => {
    this.setState({
      isShowBindDataPopUp: !this.state.isShowBindDataPopUp,
    });
  };

  showBindData = () => {
    this.setState({
      isShowBindDataPopUp: true,
    });
  };

  clearI18n = () => {
    const { onChange } = this.props;
    this.setState({
      i18nValue: {},
      isShowBindDataPopUp: false,
    });

    onChange({});
  };

  setI18nValue = (i18nkey: string, i18nPageDataList?: I18nPageDataItem[]): I18nValue => {
    const list = i18nPageDataList || this.state.i18nPageDataList || [];
    let i18nDataList: I18nDataItem[] = [];
    list.map((item) => {
      if (item.i18nkey == i18nkey) {
        i18nDataList = item.i18nDataList;
      }
      return item;
    });
    let inputValue: string | undefined;
    // 中文用于input展示
    i18nDataList.map((item) => {
      if (item.langKey == 'zh-CN') {
        inputValue = item.i18nData;
      }
      return item;
    });
    return {
      type: 'i18n',
      key: i18nkey,
      i18nDataList,
      inputValue,
    };
  };

  createNewI18nItemData = () => {
    const { onChange } = this.props;
    const { editor } = this.props.field;
    const schema = project.exportSchema();
    // schema.i18n 类型上是可选的。兜底成 {} 同时修掉一个既有运行时 bug：
    // 原代码用 JSON.stringify(i18nSchema) === '{}' 判断"i18n 结构为空"，
    // 但 undefined 时 JSON.stringify 返回 undefined 而非 '{}'，该分支永远不触发，
    // 中英默认文案就建不出来。
    const i18nSchema: Record<string, Record<string, string>> = schema.i18n ?? {};
    const newI18nKey = this.uniqueId('i18n');
    // 将新的key添加到i18nSchema中
    for (const langKey in i18nSchema) {
      i18nSchema[langKey][newI18nKey] = '';
    }

    if (JSON.stringify(i18nSchema) == '{}') {
      // i18n结构为空的话，默认建中文和英文
      i18nSchema['zh-CN'] = {};
      i18nSchema['zh-CN'][newI18nKey] = '你好';
      i18nSchema['en-US'] = {};
      i18nSchema['en-US'][newI18nKey] = 'Hello';
    }

    const i18nPageDataList = this.transfromI18nData(i18nSchema);
    const i18nValue = this.setI18nValue(newI18nKey, i18nPageDataList);

    onChange(this.parseI18nValue2PropsValue(i18nValue));

    this.updateI18nSchema(i18nValue);

    this.setState({
      i18nValue,
      isShowBindDataPopUp: true,
      isShowSearchPopUp: false,
    });
  };

  uniqueId = (prefix = '') => {
    let guid = Date.now();
    return `${prefix}-${(guid++).toString(36).toLowerCase()}`;
  };

  onClickI18nItem = (i18nItem: I18nPageDataItem) => {
    const { onChange } = this.props;
    const i18nValue = this.setI18nValue(i18nItem.i18nkey);
    this.setState({
      i18nValue,
      isShowSearchPopUp: false,
      isShowBindDataPopUp: true,
    });
    onChange(this.parseI18nValue2PropsValue(i18nValue));
  };

  parseI18nValue2PropsValue = (i18nValue: I18nValue): I18nPropsValue => {
    const propsValue: I18nPropsValue = {
      type: 'i18n',
      key: i18nValue.key,
    };

    const { i18nDataList } = i18nValue;
    i18nDataList?.map((item) => {
      propsValue[item.langKey] = item.i18nData;
      return item;
    });

    return propsValue;
  };

  renderI18nList = () => {
    const { i18nSearchDataList } = this.state;
    return (
      <div className="lowcode-setter-i18n-list">
        {i18nSearchDataList &&
          i18nSearchDataList.map((item) => {
            return (
              <div
                className="lowcode-setter-i18n-search-box-container"
                onClick={() => this.onClickI18nItem(item)}
              >
                {item.i18nDataList &&
                  item.i18nDataList.map((i18nItem) => {
                    return (
                      <div className="i18n-lang-item">
                        <div className="i18n-item-lang-type">
                          {lang[i18nItem.langKey as keyof typeof lang].i18nLangCN}
                        </div>
                        <div className="item-lang-content">{i18nItem.i18nData}</div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
      </div>
    );
  };

  onChange(value: string, type: string, e?: unknown) {
    //console.log('onChange', value, type, e);
    // 联想的数据

    const { i18nPageDataList } = this.state;
    const i18nSearchDataList: I18nPageDataItem[] = [];

    i18nPageDataList?.map((item) => {
      const i18nDataList = item.i18nDataList;
      i18nDataList.map((itemData) => {
        if (value != '' && itemData.i18nData.indexOf(value) >= 0) {
          i18nSearchDataList.push(item);
        }
        return itemData;
      });
      return item;
    });

    this.setState({
      value,
      i18nSearchDataList,
    });
  }

  i18nItemOnChange = (value: string | number, langKey: string, _key?: string) => {
    const { i18nValue } = this.state;
    const { onChange } = this.props;
    // i18n 文案为文本，Fusion Input 的 onChange 回传 string | number，此处归一化为字符串
    const textValue = String(value);
    i18nValue.i18nDataList?.map((item) => {
      if (item.langKey == langKey) {
        item.i18nData = textValue;
        if (langKey == 'zh-CN') {
          i18nValue.inputValue = textValue;
        }
      }
      return item;
    });

    this.setState({
      i18nValue,
    });

    onChange(this.parseI18nValue2PropsValue(i18nValue));

    this.updateI18nSchema(i18nValue);
  };

  updateI18nSchema = (i18nValue: I18nValue) => {
    const { editor } = this.props.field;
    const schema = project.exportSchema();
    // schema.i18n 类型上是可选的。兜底成 {} 同时修掉一个既有运行时 bug：
    // 原代码用 JSON.stringify(i18nSchema) === '{}' 判断"i18n 结构为空"，
    // 但 undefined 时 JSON.stringify 返回 undefined 而非 '{}'，该分支永远不触发，
    // 中英默认文案就建不出来。
    const i18nSchema: Record<string, Record<string, string>> = schema.i18n ?? {};
    for (const schemaLangKey in i18nSchema) {
      const schemaLangData = i18nSchema[schemaLangKey];
      for (const schemaI18nKey in schemaLangData) {
        if (i18nValue.key == schemaI18nKey) {
          const { i18nDataList } = i18nValue;
          i18nDataList?.map((i18nDataItem) => {
            if (i18nDataItem.langKey == schemaLangKey) {
              schemaLangData[schemaI18nKey] = i18nDataItem.i18nData;
            }
            return i18nDataItem;
          });
        }
      }
    }

    editor.get('designer').project.set('i18n', i18nSchema);
  };

  render() {
    const { isShowSearchPopUp, i18nValue, isShowBindDataPopUp } = this.state;
    return (
      <div className="lowcode-setter-i18n">
        <Input size="small" value={i18nValue.inputValue} />

        {!i18nValue.key ? (
          <div className="i18n-icon" onClick={this.showSearchPopUp}>
            <img src="https://gw.alicdn.com/imgextra/i2/O1CN01kvqrSB22B9CKB4yVl_!!6000000007081-2-tps-200-200.png"></img>
          </div>
        ) : (
          <div className="i18n-icon i18n-icon-selected" onClick={this.showBindDataPopUp}>
            <img src="https://gw.alicdn.com/imgextra/i3/O1CN01VpNCcg1wfTjbdHK8I_!!6000000006335-2-tps-200-200.png"></img>
          </div>
        )}
        {isShowSearchPopUp && (
          <div className="popup-container">
            <Search
              onChange={this.onChange.bind(this)}
              popupContent={this.renderI18nList()}
              onSearch={this.onSearch.bind(this)}
              type="normal"
              shape="simple"
              style={{ width: '195px' }}
              placeholder="搜索已定义的文案"
            />
            <Button type="primary" className="new-i18n-button" onClick={this.createNewI18nItemData}>
              <Icon type="add" />
              创建新的多语言文案
            </Button>
          </div>
        )}
        {isShowBindDataPopUp && (
          <div className="binddata-popup-container">
            <div className="clear-i18n" onClick={this.clearI18n}>
              解除文案关联
            </div>
            {i18nValue.i18nDataList &&
              i18nValue.i18nDataList.map((i18nItem) => {
                return (
                  <div className="bind-item">
                    <p>{lang[i18nItem.langKey as keyof typeof lang].i18nLangCN}</p>
                    <Input
                      size="small"
                      value={i18nItem.i18nData}
                      onChange={(value, type, e) =>
                        this.i18nItemOnChange(value, i18nItem.langKey, i18nValue.key)
                      }
                    />
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  }
}

export default I18nSetter;
