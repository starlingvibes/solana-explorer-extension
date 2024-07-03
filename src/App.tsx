import { useEffect, useState } from 'react';
import superteamUkLogo from './assets/extension-icon.jpg';
import './App.css';
import OpenAI from 'openai';

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
  nativeTransfers: [
    {
      amount: number;
    }
  ];
}

function App() {
  const [solanaData, setSolanaData] = useState<SolanaData | null>(null);
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>('');

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  useEffect(() => {
    const fetchSolanaData = async () => {
      const result = await chrome.storage.local.get('solanaData');
      if (result.solanaData) {
        setSolanaData(result.solanaData);

        if (result.solanaData.accountAddress) {
          const data = await fetchHeliusData(result.solanaData.accountAddress);
          await fetchAISummary(data);
        } else if (result.solanaData.txHash) {
          const data = await fetchHeliusData(result.solanaData.txHash);
          await fetchAISummary(data);
        }
      }
    };

    const handleMessage = (message: { action: string }) => {
      if (message.action === 'updateData') {
        fetchSolanaData();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    fetchSolanaData();

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  async function fetchAccountTransactions(accountAddress: string) {
    const cacheKey = `transactions_${accountAddress}`;
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
    return data;
  }

  async function fetchTransactionDetails(transactionSignature: Array<string>) {
    const cacheKey = `transaction_${transactionSignature}`;
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

    return data;
  }

  async function fetchHeliusData(identifier: string) {
    let data;
    setIsLoading(true);
    if (identifier.length <= 44) {
      data = await fetchAccountTransactions(identifier);
      setTransactions(data);
      setIsLoading(false);
      return data;
    } else if (identifier.length > 44) {
      const arr = [];
      arr.push(identifier);
      data = await fetchTransactionDetails(arr);
      setTransactions(data);
      setIsLoading(false);
      return data;
    } else {
      throw new Error('Invalid identifier provided.');
    }
  }

  async function fetchAISummary(data: object) {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a large language model extensively trained in Solana Program's Interface Description Language. I am providing some data in JSON format which represents the data about a given transaction/transactions. Your summary should be a general overview and must not exceed 60 words. You can only exceed the constraint if the data is an array of transactions, in that case, you can output more words but in the given format: <x> tokens transferred from <source_address> to <destination_address> and vice vera (you get the gist)`,
        },
        {
          role: 'user',
          content: `Carefully analyze the provided data and return a concise summary of what's going on in the transaction/transactions. Here's the data - ${data}`,
        },
      ],
      model: 'gpt-3.5-turbo',
    });

    setAiSummary(completion.choices[0].message.content);
  }

  const renderData = () => {
    if (isLoading) {
      return <p>Loading...</p>;
    }
    if (!solanaData) {
      return <p>No data available.</p>;
    }

    return (
      <div>
        {solanaData?.accountAddress && (
          <p>Address: {solanaData?.accountAddress || 'Address unavailable'}</p>
        )}
        {solanaData?.txHash && (
          <p>
            Transaction hash:{' '}
            {solanaData?.txHash || 'Transaction hash unavailable'}
          </p>
        )}
        <br />
        <p>
          <strong>AI Summary:</strong> {aiSummary || 'Summary unavailable'}
        </p>
        <p>Here are the transaction details:</p>
        <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
          {solanaData.accountAddress
            ? transactions.map(
                (transaction: SolanaTransaction, index: number) => (
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
                      <strong>Transaction hash:</strong> {transaction.signature}
                    </p>
                    <p>
                      <strong>Description:</strong> {transaction.description}
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(transaction.timestamp * 1000).toLocaleString()}
                    </p>
                  </li>
                )
              )
            : transactions
                .filter(
                  (transaction: SolanaTransaction) =>
                    transaction.signature === solanaData.txHash
                )
                .map((transaction: SolanaTransaction, index: number) => (
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
                      <strong>Transaction hash:</strong> {transaction.signature}
                    </p>
                    <p>
                      <strong>Description:</strong> {transaction.description}
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(transaction.timestamp * 1000).toLocaleString()}
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
        <a href='https://uk.superteam.fun' target='_blank'>
          <img src={superteamUkLogo} className='logo' alt='Vite logo' />
        </a>
      </div>
      <h1>Mini Solana Explorer</h1>
      <div className='card'>{renderData()}</div>
      <p className='read-the-docs'>© 2024 Made with ❤️ for Solana</p>
    </>
  );
}

export default App;
