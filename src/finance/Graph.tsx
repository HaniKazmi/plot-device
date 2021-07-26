import { useState, useEffect } from "react";
import Plot from "react-plotly.js";

import transactionData, { CsvData } from './Data'

function TransactionGraph() {
    const [data, setData] = useState<CsvData[]>([]);

    useEffect(() => {
        transactionData(setData);
    }, []);

    return <IncomeGraph data={data} />
}

type IncomeGraphProps = {
    data: CsvData[]
};

function IncomeGraph({ data }: IncomeGraphProps) {
    return <Plot style={{ width: '100vw', height: '100vh' }}
        data={[
            {
                x: data.map((row: { Month?: any; }) => row.Month),
                y: data.map((row: { Incoming?: any; }) => row.Incoming),
                type: 'scatter',
                mode: 'lines',
                name: "Incoming"
            },
            {
                x: data.map((row: { Month?: any; }) => row.Month),
                y: data.map((row: { Outgoings?: any; }) => row.Outgoings),
                type: 'scatter',
                mode: 'lines',
                name: "Outgoings"
            },
        ]}
        config={{ displayModeBar: false, responsive: true }}
        layout={{
            title: 'Incomings and Outgoings',
            bargroupgap: 0.05,
            bargap: 0.33,
            legend: { x: 1, y: 1, xanchor: 'right' }
        }}
    />
}

export default TransactionGraph;