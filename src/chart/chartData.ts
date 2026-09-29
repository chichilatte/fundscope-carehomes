import type { LineSeriesOption } from "echarts/charts";
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption } from "echarts/components";
import type { ComposeOption } from "echarts/core";
import { addWeeksISO } from "../domain/dates";
import type { SimulationResult } from "../domain/types";
import { formatISODate } from "../format/dates";
import { formatGBPWhole } from "../format/money";

export type ChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | LegendComponentOption | TooltipComponentOption
>;

export interface ChartContext {
  startDate: string;
  upperLimit: number;
  lowerLimit: number;
  meansTestThreshold: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const round2 = (v: number): number => Math.round(v * 100) / 100;

export function buildChartOption(result: SimulationResult, ctx: ChartContext): ChartOption {
  const rows = result.weekly;

  const capital = rows.map((r) => [r.date, round2(r.capitalEnd)] as [string, number]);
  const cash = rows.map((r) => [r.date, round2(r.cashEnd)] as [string, number]);
  const home = rows.map((r) => [r.date, round2(r.homeEnd)] as [string, number]);

  const meansDate =
    result.milestones.meansTestWeek === null
      ? null
      : addWeeksISO(ctx.startDate, result.milestones.meansTestWeek - 1);
  const takeoverDate =
    result.milestones.councilTakeoverWeek === null
      ? null
      : addWeeksISO(ctx.startDate, result.milestones.councilTakeoverWeek - 1);

  // Month labels, with the year shown only in January and on the first tick.
  let firstLabel = true;
  const monthLabel = (value: number | string): string => {
    const d = new Date(Number(value));
    const month = MONTHS[d.getUTCMonth()] ?? "";
    const showYear = d.getUTCMonth() === 0 || firstLabel;
    firstLabel = false;
    return showYear ? `${d.getUTCFullYear()} ${month}` : month;
  };

  return {
    color: ["#1F4E79", "#2E8B57", "#B45309"],
    legend: { bottom: 0 },
    grid: { left: 80, right: 40, top: 50, bottom: 80 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => (typeof value === "number" ? formatGBPWhole(value) : String(value)),
    },
    xAxis: {
      type: "time",
      axisLabel: { formatter: monthLabel, rotate: 30, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (value) => formatGBPWhole(Number(value)) },
    },
    series: [
      {
        name: "Capital (assessment)",
        type: "line",
        showSymbol: false,
        lineStyle: { width: 2 },
        data: capital,
        markLine: {
          silent: true,
          symbol: "none",
          data: [
            {
              yAxis: ctx.upperLimit,
              lineStyle: { type: "dashed", color: "#C00000" },
              label: { formatter: `Upper ${formatGBPWhole(ctx.upperLimit)}`, position: "insideEndTop" },
            },
            {
              yAxis: ctx.lowerLimit,
              lineStyle: { type: "dashed", color: "#C00000" },
              label: { formatter: `Lower ${formatGBPWhole(ctx.lowerLimit)}`, position: "insideEndBottom" },
            },
            {
              yAxis: ctx.meansTestThreshold,
              lineStyle: { type: "dashed", color: "#7030A0" },
              label: { formatter: `Means-test ${formatGBPWhole(ctx.meansTestThreshold)}`, position: "insideEndTop" },
            },
            ...(meansDate
              ? [{
                  xAxis: meansDate,
                  lineStyle: { type: "solid" as const, color: "#7030A0", width: 2 },
                  label: { formatter: `Means-test · ${formatISODate(meansDate)}`, position: "insideEndTop" as const },
                }]
              : []),
            ...(takeoverDate
              ? [{
                  xAxis: takeoverDate,
                  lineStyle: { type: "solid" as const, color: "#FF0000", width: 2 },
                  label: { formatter: `Takeover · ${formatISODate(takeoverDate)}`, position: "insideEndTop" as const },
                }]
              : []),
          ],
        },
      },
      { name: "Cash", type: "line", showSymbol: false, data: cash },
      { name: "Home", type: "line", showSymbol: false, data: home },
    ],
  };
}
