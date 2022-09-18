import Plotly from 'plotly.js/lib/core'
import bar from 'plotly.js/lib/bar';
import sunburst from 'plotly.js/lib/sunburst';
import createPlotlyComponent from 'react-plotly.js/factory'

const loadPlotly = () => {
  Plotly.register([ bar, sunburst ])
  return createPlotlyComponent(Plotly);
}

export default loadPlotly(); 