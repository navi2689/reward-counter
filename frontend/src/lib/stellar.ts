import {
  rpc,
  Networks,
  Contract,
  TransactionBuilder,
  Account,
  scValToNative,
} from "@stellar/stellar-sdk";

const TESTNET_RPC = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const DEMO_ADDRESS = "GDEMO000000000000000000000000000000000000000000000000000";

export async function connectFreighter(): Promise<{
  address: string | null;
  isLive: boolean;
  error?: string;
}> {
  try {
    if (typeof window !== "undefined" && (window as any).freighterApi !== undefined) {
      // Using window explicitly to avoid npm package version mismatches
      const isConnected = await (window as any).freighterApi.isConnected();
      if (isConnected) {
        const isAllowed = await (window as any).freighterApi.setAllowed();
        if (isAllowed) {
          const pubKey = await (window as any).freighterApi.getPublicKey();
          return { address: pubKey, isLive: true };
        } else {
          return { address: null, isLive: false, error: "Wallet connection was rejected." };
        }
      }
    }
    // Freighter not available or not connected, enter demo mode
    return { address: DEMO_ADDRESS, isLive: false };
  } catch (error: any) {
    console.warn("Freighter connect error, falling back to demo mode:", error);
    return { address: DEMO_ADDRESS, isLive: false, error: "Freighter connect error, entering demo mode." };
  }
}

export async function fetchCount(
  contractId: string,
  userAddress: string,
  isLiveMode: boolean
): Promise<number> {
  if (isLiveMode) {
    const server = new rpc.Server(TESTNET_RPC);
    const contract = new Contract(contractId);
    
    const txBuilder = new TransactionBuilder(
      new Account(userAddress, "0"),
      { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
    );
    txBuilder.addOperation(contract.call("get_count"));
    const dummyTx = txBuilder.setTimeout(30).build();

    const simResponse = await server.simulateTransaction(dummyTx);
    if (rpc.Api.isSimulationSuccess(simResponse)) {
      if (simResponse.result && simResponse.result.retval) {
        return Number(scValToNative(simResponse.result.retval));
      }
    }
    throw new Error("Could not read count. Is the contract deployed?");
  } else {
    // Demo mode
    return parseInt(localStorage.getItem("reward_counter_demo") || "0", 10);
  }
}

export async function incrementCount(
  contractId: string,
  userAddress: string,
  isLiveMode: boolean,
  setStatus: (msg: string) => void
): Promise<number | null> {
  if (isLiveMode) {
    const server = new rpc.Server(TESTNET_RPC);
    const contract = new Contract(contractId);

    let account;
    try {
      account = await server.getAccount(userAddress);
    } catch {
      setStatus("⚠️ Account not found. Fund it on testnet first.");
      account = new Account(userAddress, "0");
    }

    let tx = new TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("increment"))
      .setTimeout(30)
      .build();

    setStatus("Simulating transaction...");
    const simResponse = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simResponse)) {
      throw new Error("Simulation Error: " + simResponse.error);
    }

    tx = rpc.assembleTransaction(tx, simResponse).build();

    setStatus("⏳ Waiting for wallet signature...");
    const signedXdr = await (window as any).freighterApi.signTransaction(tx.toXDR(), "TESTNET");
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    setStatus("📡 Sending to network...");
    const sendResponse = await server.sendTransaction(signedTx);

    if (sendResponse.status === "PENDING") {
      setStatus("⏳ Waiting for confirmation...");
      let txStatus = await server.getTransaction(sendResponse.hash);
      while (txStatus.status === "NOT_FOUND") {
        await new Promise((r) => setTimeout(r, 2000));
        txStatus = await server.getTransaction(sendResponse.hash);
      }
      if (txStatus.status === "SUCCESS") {
        setStatus("🎉 Increment successful!");
        return await fetchCount(contractId, userAddress, true);
      }
    }
    throw new Error("Transaction failed.");
  } else {
    // Demo mode
    let count = parseInt(localStorage.getItem("reward_counter_demo") || "0", 10);
    count += 1;
    localStorage.setItem("reward_counter_demo", count.toString());
    setStatus("🎉 Incremented! (demo mode)");
    return count;
  }
}
