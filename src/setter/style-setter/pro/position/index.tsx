import * as React from 'react';
import Row from '../../components/row';
import { Collapse, NumberPicker, Select } from '@alifd/next';
import { useEffect } from 'react';
import PositionBox from '../position/positionBox';
import { StyleData, onStyleChange } from '../../utils/types';
import { intlLocal } from './locale';
import { isCssVarBind } from '../../utils';

const {Panel} = Collapse;

interface layoutProps {
  styleData: StyleData | any;
  onStyleChange?: onStyleChange;
  positionPropsConfig?: any;
}

const positionConfig = intlLocal();

export default (props: layoutProps) => {
  const { float, clear, position } = positionConfig;

  const { onStyleChange, styleData, positionPropsConfig } = props;

  const { isShowFloat, isShowClear } = positionPropsConfig;

  const onZIndexChange = (zIndex: number | string | undefined) => {
    onStyleChange?.([{ styleKey: 'zIndex', value: zIndex == null ? null : Number(zIndex) }]);
  };

  const initData = () => {};

  useEffect(() => {
    initData();
  }, []);

  return (
    <Collapse defaultExpandedKeys={['0']}>
      <Panel title={positionConfig.title}>
        <Row title={position.title} styleData={styleData} styleKey="position">
          <Select
            dataSource={position.dataList}
            value={styleData.position}
            hasClear
            onChange={(val) => onStyleChange?.([{ styleKey: 'position', value: String(val ?? '') }])}
          />
        </Row>

        {styleData.position && styleData.position != 'static' && (
          <PositionBox {...props} />
        )}

        <Row title={'zIndex'} styleData={styleData} styleKey="zIndex">
          <NumberPicker
            disabled={isCssVarBind(styleData.zIndex)}
            step={1}
            precision={2}
            onChange={onZIndexChange}
            value={styleData.zIndex}
          />
        </Row>

        {isShowFloat && (
          <Row
            title={float.title}
            dataList={float.dataList}
            onStyleChange={onStyleChange}
            styleData={styleData}
            styleKey="float"
          />
        )}
        {isShowClear && (
          <Row
            title={clear.title}
            dataList={clear.dataList}
            onStyleChange={onStyleChange}
            styleData={styleData}
            styleKey="clear"
          />
        )}
      </Panel>
    </Collapse>
  );
};
