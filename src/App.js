import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { ethers } from 'ethers';
import PhysicalTeesABI from './abi.json';
import './App.css';


function App() {
  const [account, setAccount] = useState(null);
  const [maxTees, setMaxTees] = useState(0);
  const [boughtTees, setBoughtTees] = useState(0);
  const [price, setPrice] = useState("");
  const [internationalPrice, setInternationalPrice] = useState("");
  const [paused, setPaused] = useState(false);
  const [adminAddress, setAdminAddress] = useState(null);
  const [ownerAddress, setOwnerAddress] = useState(null);
  const [buyerOrdersIds, setBuyerOrdersIds] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [newOwner, setNewOwner] = useState();
  const [newAdmin, setNewAdmin] = useState();
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState(0);
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState({});
  const [orderError, setOrderError] = useState(null);
  const [ordersFound, setOrdersFound] = useState(false);
  const [orderIdsToMarkFulfilled, setOrderIdsToMarkFulfilled] = useState('');
  const [fulfillmentError, setFulfillmentError] = useState(null);
  const [fulfilledOrders, setFulfilledOrders] = useState([]);
  const [fulfillmentMessage, setFulfillmentMessage] = useState(null);


  const web3 = new Web3(window.ethereum);
  const contractAddress = '0x7D1B9649a33317EAB4A6f3685721a88aC088378e';
  const contract = new web3.eth.Contract(PhysicalTeesABI,contractAddress);

  useEffect(() => {
    const loadBlockchainData = async () => {
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
      const _maxTees = await contract.methods.getmaxtees().call();
      setMaxTees(_maxTees);
      const _boughtTees = await contract.methods.getboughtTees().call();
      setBoughtTees(_boughtTees);
      const _price = await contract.methods.getPrice().call();
      setPrice(_price);
      const _internationalPrice = await contract.methods.getInternationalPrice().call();
      setInternationalPrice(_internationalPrice);
      const _paused = await contract.methods.isPaused().call();
      setPaused(_paused);
      const _ownerAddress = await contract.methods.owner().call();
      setOwnerAddress(_ownerAddress);
      const _adminAddress = await contract.methods.admin().call();
      setAdminAddress(_adminAddress);
      const getContractBalance = async () => {
        const balanceInWei = await web3.eth.getBalance(contractAddress);
        const balanceInEth = web3.utils.fromWei(balanceInWei, 'ether');
        setBalance(balanceInEth);
      }
      await getContractBalance();
    }
    
    loadBlockchainData();
  }, []);

  const gasPrice = web3.utils.toWei('300', 'gwei'); // set the gas price to 300 gwei

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Prompt user to connect their wallet
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3 = window.web3;
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
      } catch (error) {
        console.error(error);
      }
    } else {
      console.error('Please install MetaMask to use this app');
    }
  }

  const setMaxTeesFunc = async (e) => {
    e.preventDefault();
    await contract.methods.setmaxTees(maxTees).send({ from: account, gasPrice: gasPrice });
    setMaxTees(0);
    window.location.reload();
  }

  const setPriceFunc = async (e) => {
    e.preventDefault();
    await contract.methods.setPrice(price).send({ from: account, gasPrice: gasPrice });
    setPrice(0);
    window.location.reload();
  }

  const setInternationalPriceFunc = async (e) => {
    e.preventDefault();
    await contract.methods.setInternationalPrice(internationalPrice).send({ from: account, gasPrice: gasPrice });
    setInternationalPrice(0);
    window.location.reload();
  }

  const markFulfilledFunc = async (orderId) => {
    await contract.methods.markFulfilled(orderId).send({ from: account, gasPrice: gasPrice });
    const updatedOrders = [...allOrders];
    const index = updatedOrders.findIndex((order) => order.orderId === orderId);
    updatedOrders[index].fulfilled = true;
    setAllOrders(updatedOrders);
  }

  const markFulfilledBatchFunc = async (orderIdsToMarkFulfilled) => {
    const orderIds = orderIdsToMarkFulfilled.split(',').map((orderId) => orderId.trim());
    const orders = await Promise.all(orderIds.map((orderId) => contract.methods.getOrder(orderId).call()));
    const unfulfilledOrders = orders.filter((order) => !order.fulfilled);
  
    if (unfulfilledOrders.length < orderIds.length) {
      const fulfilledOrderIds = orders.filter((order) => order.fulfilled).map((order) => order.orderId).join(", ");
      throw new Error(`Order IDs ${fulfilledOrderIds} have already been fulfilled.`);
    }
  
    try {
      await contract.methods.markFulfilledBatch(orderIds).send({ from: account, gasPrice: gasPrice });
      setFulfillmentError(null); // Clear any previous error message
      setFulfilledOrders([...fulfilledOrders, ...orderIds]); // Add the newly fulfilled order IDs to the list
    } catch (error) {
      console.error(error);
      setFulfillmentError('An error occurred while marking orders as fulfilled.');
    }
  };
  
  
  const handleMarkFulfilledBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      await markFulfilledBatchFunc(orderIdsToMarkFulfilled);
      const message = `Successfully marked orders ${orderIdsToMarkFulfilled} as fulfilled.`;
      setFulfillmentMessage(message);
    } catch (error) {
      setFulfillmentError(error.message);
    }
  };
  
  
  const getOrdersByBuyerFunc = async (walletAddress) => {
    const orders = await contract.methods.getOrdersByBuyer(walletAddress).call();
    setBuyerOrdersIds(orders);
    setOrdersFound(orders.length > 0);
    setOrderError(null); // clear any previous error message
  };
  
  const getOrderByIdFunc = async (_orderId) => {
    try {
      const order = await contract.methods.getOrder(_orderId).call();
      setOrderError(null); // Clear any previous error message
      setOrder(order);
    } catch (error) {
      console.log(`Order ID ${_orderId} does not exist yet.`);
      setOrderError(`Order ID ${_orderId} does not exist yet.`);
      setOrder(null);
    }
  }
  
  const pauseContractFunc = async () => {
    await contract.methods.pauseContract().send({ from: account, gasPrice: gasPrice });
    const _paused = await contract.methods.isPaused().call();
    setPaused(_paused);
  }

  const withdrawalFunc = async () => {
    await contract.methods.withdraw().send({ from: account, gasPrice: gasPrice });
    window.location.reload();
}

  const changeOwnerFunc = async (newOwner) => {
    await contract.methods.changeOwner(newOwner).send({ from: account, gasPrice: gasPrice });
    const _OwnerAddress = await contract.methods.owner().call();
    setOwnerAddress(_OwnerAddress);
  }

  const changeAdminFunc = async (newAdmin) => {
    await contract.methods.setAdmin(newAdmin).send({ from: account, gasPrice: gasPrice });
    const _adminAddress = await contract.methods.admin().call();
    setAdminAddress(_adminAddress);
  }
  
  const handleReset = (e) => {
    e.preventDefault();
    setOrderIdsToMarkFulfilled('');
    setFulfillmentError(null);
    setFulfilledOrders([]);
    setFulfillmentMessage(null);
  };
  
  

  return (
    <div className="App">
      <header className="App-header">
        <h1>Physical Tees Admin Portal</h1>
        <p>Connected to account: {account}</p>
        <button onClick={connectWallet}>Connect Wallet</button>
      </header>
      <main>
      <section className="tees-sold">
  <h2>Tees Sold</h2>
  <p>{boughtTees} out of {maxTees} TEES sold</p>
  <p>{(boughtTees / maxTees * 100).toFixed(2)}% sold</p>
</section>
<div className="box">
        <section>
          <h2>Set Max Tees</h2>
          <form onSubmit={setMaxTeesFunc}>
            <label>
              Max Tees:
              <input type="number" value={maxTees} onChange={(e) => setMaxTees(e.target.value)} />
            </label>
            <button type="submit">Set Max Tees</button>
          </form>
        </section>
        <section>
          <h2>Set Price</h2>
          <form onSubmit={setPriceFunc}>
            <label>
              Price:
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <button type="submit">Set Price</button>
          </form>
        </section>
        <section>
          <h2>Set International Price</h2>
          <form onSubmit={setInternationalPriceFunc}>
            <label>
              International Price:
              <input type="number" value={internationalPrice} onChange={(e) => setInternationalPrice(e.target.value)} />
            </label>
            <button type="submit">Set International Price</button>
          </form>
        </section>
        </div>
        <div className="box">
        <section>
  <h2>Orders by Buyer</h2>
  <form onSubmit={(e) => { e.preventDefault(); getOrdersByBuyerFunc(walletAddress); }}>
    <label>
      Wallet Address:
      <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
    </label>
    <button type="submit">Get Orders</button>
    <button type="button" onClick={() => { setWalletAddress(''); setBuyerOrdersIds([]); setOrdersFound(null); }}>Refresh</button>
  </form>
  {ordersFound === null ? null : (
    ordersFound ? (
      <ul>
        {buyerOrdersIds.map((orderId) => (
          <li key={orderId}>Order ID: {orderId.toString()}</li>
        ))}
      </ul>
    ) : (
      ordersFound &&
        <p>No orders found for the specified wallet address.</p>
    )
      )}
</section>
<section>
  <h2>Order Details</h2>
  <form onSubmit={(e) => { e.preventDefault(); getOrderByIdFunc(orderId); }}>
    <label>
      Order ID:
      <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
    </label>
    <button type="submit">Get Order</button>
    <button type="button" onClick={() => { setOrderId(''); setOrderError(null); setOrder(null); }}>Refresh</button>
  </form>
  {order && order.orderTime !== "0" && (
    <div>
      <p>Order ID: {order.orderId}</p>
      <p>Buyer: {order.buyer}</p>
      <p>Order Time: {order.orderTime}</p>
      <p>Fulfilled: {order.fulfilled ? 'Yes' : 'No'}</p>
      {!order.fulfilled && <button onClick={() => markFulfilledFunc(order.orderId)}>Mark Fulfilled</button>}
    </div>
  )}
  {order && order.orderTime === "0" && (
    <p>Order ID does not exist yet.</p>
    )}
</section>
<section>
  <h2>Batch Mark Orders Fulfilled</h2>
  <form onSubmit={handleMarkFulfilledBatchSubmit}>
    <label>
      Order IDs (comma-separated):
      <input type="text" value={orderIdsToMarkFulfilled} onChange={(e) => setOrderIdsToMarkFulfilled(e.target.value)} />
    </label>
    <button type="submit">Mark Fulfilled</button>
    <button onClick={handleReset}>Reset</button>
  </form>
  {fulfillmentError && (
    <p>{fulfillmentError}</p>
  )}
</section>
</div>
<div className="box-owner">
        <section>
          <h2>Pause Contract</h2>
          <p>Contract is currently {paused ? 'paused' : 'active'}</p>
          <button onClick={pauseContractFunc}>{paused ? 'Unpause Contract' : 'Pause Contract'}</button>
        </section>
        <section>
        <h2>Withdraw Balance</h2>
        <p>Contract Balance: {balance} ETH</p>
        <button onClick={withdrawalFunc}>Withdraw Balance</button>
      </section>
      <section>
      <h2>Change Owner</h2>
      <p>Current Owner Address: {ownerAddress}</p>
        <form onSubmit={(e) => { e.preventDefault(); changeOwnerFunc(newOwner); }}>
        <label>
        New Owner Address:
      <input type="text" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
       </label>
       <button type="submit">Change Owner</button>
       </form>
      </section>
      <section>
      <h2>Change Admin</h2>
      <p>Current Admin Address: {adminAddress}</p>
        <form onSubmit={(e) => { e.preventDefault(); changeAdminFunc(newAdmin); }}>
        <label>
        New Admin Address:
      <input type="text" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} />
       </label>
       <button type="submit">Change Admin</button>
       </form>
      </section>
      </div>
      </main>
    </div>
  );
}

export default App;
