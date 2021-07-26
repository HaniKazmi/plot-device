import parse from 'csv-parse/lib/sync'
import transactionUrl from './data-set/Transaction Export 23-07-2021.csv';

export interface CsvData {
    Month?: string,
    Incoming?: string | number,
    Outgoings?: string | number
}

interface Transaction {
    date: string,
    amount: number,
    description: string,
    category: string,
    categoryGroup: string,
    notes: string
}


async function fetchTransactionData(setData: (value: any) => any) {

    fetch(transactionUrl)
        .then(response => response.text())
        .then(data => parse(data, { columns: ['date', 'amount', 'description', 'category', 'categoryGroup', 'account', 'toAccount', 'project', 'notes'] }))
        .then(transactionToGrouped)
        .then(setData);
}

function transactionToGrouped(data: Transaction[]) {
    const grouped: { [key: string]: Transaction[] } = data.reduce((g: any, data: Transaction) => {
        const month = data.date.slice(0, -3)
        g[month] = g[month] || []
        g[month].push(data)
        return g
    }, {})

    return Object.values(grouped).map(dates => {
        const csvData = {
            Month: dates[0].date.slice(0, -3),
            Incoming: 0,
            Outgoings: 0
        }

        dates.reduce((g: any, date: any) => {
            if (date['categoryGroup'] === 'Income'
                && date['category'] !== 'Rewards'
                && date['category'] !== 'Work expenses'
                && date['category'] !== 'Pension income') {
                g.Incoming += Number(date.amount)
            }

            if (date['categoryGroup'] === 'Taxes') {
                g.Incoming += Number(date.amount)
            }


            if (date['categoryGroup'] !== 'Income' && date['categoryGroup'] !== 'Taxes' && date['categoryGroup'] !== 'Transfers') {
                g.Outgoings += Number(date.amount)
            }
            return g;
        }, csvData)

        csvData.Outgoings = -csvData.Outgoings;

        return csvData;
    }).filter(row => row.Month! > '2019-02' && row.Month! < '2021-07')
}

export default fetchTransactionData