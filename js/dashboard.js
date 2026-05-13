/* ==========================================================
   dashboard.js — renders the 14-day activity bar chart
   ========================================================== */

function renderActivityChart() {
  const wrap = document.getElementById('chartWrap');
  if (!wrap) return;

  const { days, values } = SYNAPSE_CHART;
  if (!values || !values.length) {
    wrap.innerHTML = '';
    return;
  }
  const max = Math.max(...values) || 1;

  wrap.innerHTML = values
    .map((v, i) => {
      const h = Math.round((v / max) * 180);
      return `
        <div class="chart-bar" data-day="${days[i]}" style="height:${h}px">
          <div class="chart-tooltip">${v} events</div>
        </div>
      `;
    })
    .join('');
}
window.renderActivityChart = renderActivityChart;
renderActivityChart();
