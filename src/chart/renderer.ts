import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsType } from "echarts/core";
import type { ChartOption } from "./chartData";

echarts.use([LineChart, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, SVGRenderer]);

export interface ChartRenderer {
  setOption(option: ChartOption): void;
  clear(): void;
  resize(): void;
}

export function createChartRenderer(container: HTMLElement): ChartRenderer {
  const chart: EChartsType = echarts.init(container, undefined, { renderer: "svg" });

  return {
    setOption(option) {
      chart.setOption(option, { notMerge: true });
    },
    clear() {
      chart.clear();
    },
    resize() {
      chart.resize();
    },
  };
}
