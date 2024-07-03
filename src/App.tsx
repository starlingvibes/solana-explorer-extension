import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

interface SolanaData {
  type: string;
  id: string;
  accountAddress: string;
  txHash: string;
}

interface SolanaTransaction {
  description: string;
  signature: string;
  timestamp: number;
  tokenTransfers: [
    {
      tokenAmount: number;
    }
  ];
}

function App() {
  const [solanaData, setSolanaData] = useState<SolanaData | null>(null);
  // const [transactions, setTransactions] = useState<unknown[]>([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchSolanaData = async () => {
      const result = await chrome.storage.local.get('solanaData');
      if (result.solanaData) {
        setSolanaData(result.solanaData);
        if (result.solanaData.accountAddress) {
          await fetchHeliusData(result.solanaData.accountAddress);
        } else if (result.solanaData.txHash) {
          await fetchHeliusData(result.solanaData.txHash);
        }
      }
    };

    async function fetchAccountTransactions(accountAddress: string) {
      const cacheKey = `transactions_${accountAddress}`;
      console.log(cacheKey);
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_BASE_URL
        }/addresses/${accountAddress}/transactions?api-key=${
          import.meta.env.VITE_API_KEY
        }`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log(data);
      return data;
    }

    async function fetchTransactionDetails(transactionSignature: string) {
      const cacheKey = `transaction_${transactionSignature}`;
      console.log('Cache key', cacheKey);
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/transactions?api-key=${
          import.meta.env.VITE_API_KEY
        }`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transactions: transactionSignature }),
        }
      );
      const data = await response.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log(data);

      return data;
    }

    async function fetchHeliusData(identifier: string) {
      let data;
      console.log('Input identifier', identifier);
      if (identifier.length === 44) {
        data = await fetchAccountTransactions(identifier);
        console.log('Account transactions data', data);
        setTransactions(data);
        return data;
      } else if (identifier.length === 88) {
        data = await fetchTransactionDetails(identifier);
        console.log('Transaction details data', data);
        setTransactions(data);
        return data;
      } else {
        throw new Error('Invalid identifier provided.');
      }
    }

    fetchSolanaData();
  }, []);

  const renderData = () => {
    console.log('Solana data', solanaData);
    if (!solanaData) {
      return <p>No data available.</p>;
    }

    return (
      <div>
        <p>Address: {solanaData?.accountAddress || 'Address unavailable'}</p>
        <p>
          Transaction hash:{' '}
          {solanaData?.txHash || 'Transaction hash unavailable'}
        </p>
        <br />
        <p>Here are the transaction details:</p>
        <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
          {transactions.map((transaction: SolanaTransaction, index: number) => (
            <li
              key={index}
              style={{
                marginBottom: '10px',
                border: '1px solid #ccc',
                padding: '10px',
                borderRadius: '5px',
              }}
            >
              <p>
                <strong>Transaction ID:</strong> {transaction.signature}
              </p>
              <p>
                <strong>Description:</strong> {transaction.description}
              </p>
              <p>
                <strong>Amount:</strong>{' '}
                {transaction.tokenTransfers[0].tokenAmount}
              </p>
              <p>
                <strong>Date:</strong>{' '}
                {new Date(Date.now() - transaction.timestamp).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      <div>
        <a href='https://vitejs.dev' target='_blank'>
          <img src={viteLogo} className='logo' alt='Vite logo' />
        </a>
        <a href='https://react.dev' target='_blank'>
          <img src={reactLogo} className='logo react' alt='React logo' />
        </a>
      </div>
      <h1>Mini Solana Explorer</h1>
      <div className='card'>
        {renderData()}
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className='read-the-docs'>
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
