"use client";

import { useState, useEffect } from "react";
import { connectFreighter, fetchCount, incrementCount } from "@/lib/stellar";

export default function Home() {
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [address, setAddress] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string>("");
  const [count, setCount] = useState<number | string>("?");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const handleConnect = async () => {
    if (!contractId.trim()) {
      setStatusMsg("⚠️ Please enter a Contract ID first.");
      return;
    }

    setIsLoading(true);
    setStatusMsg("Connecting to Freighter...");

    try {
      const { address: pubKey, isLive, error } = await connectFreighter();

      if (error && !pubKey) {
        setStatusMsg(`❌ ${error}`);
        setIsLoading(false);
        return;
      }

      setAddress(pubKey);
      setIsLiveMode(isLive);
      setIsConnected(true);
      
      if (isLive) {
        setStatusMsg("✅ Connected to Freighter wallet!");
      } else {
        setStatusMsg("Running in Demo Mode — counter is stored locally.");
      }

      // Initial count fetch after connecting
      await handleRefreshCount(pubKey!, isLive);

    } catch (error: any) {
      console.error(error);
      setStatusMsg("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshCount = async (usrAddress = address, live = isLiveMode) => {
    if (!usrAddress) return;
    setIsLoading(true);
    setStatusMsg("Fetching current count...");
    
    try {
      const currentCount = await fetchCount(contractId, usrAddress, live);
      setCount(currentCount);
      setStatusMsg("✅ Count updated.");
    } catch (error: any) {
      console.error(error);
      setStatusMsg("Error reading count: " + error.message);
      setCount("Err");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncrement = async () => {
    if (!address) return;
    setIsLoading(true);
    setStatusMsg("Preparing increment...");

    try {
      const newCount = await incrementCount(contractId, address, isLiveMode, setStatusMsg);
      if (newCount !== null) {
        setCount(newCount);
      }
    } catch (error: any) {
      console.error(error);
      setStatusMsg("❌ Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-4 font-sans selection:bg-rose-500/30">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-br from-rose-400 to-indigo-400 bg-clip-text text-transparent mb-2">
            Reward Counter
          </h1>
          <p className="text-sm text-slate-400">Interact with Soroban Testnet</p>
        </div>

        {!isConnected ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <label htmlFor="contractId" className="block text-sm font-medium text-slate-400 mb-1 ml-1">
                Contract ID
              </label>
              <input
                id="contractId"
                type="text"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                placeholder="Enter Contract ID"
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full group relative inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-rose-500 to-indigo-500 font-semibold text-white rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>Connect Freighter</>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700/50 text-xs text-slate-300 mb-6">
                <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]'}`} />
                {isLiveMode ? `Live: ${address?.substring(0, 6)}...${address?.slice(-4)}` : "Demo Mode"}
              </div>

              <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-8 shadow-inner mb-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-6xl font-bold bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent font-mono tracking-tight drop-shadow-sm">
                  {count}
                </span>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-2 font-medium">Current Count</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRefreshCount()}
                disabled={isLoading}
                className="col-span-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Refresh
              </button>
              <button
                onClick={handleIncrement}
                disabled={isLoading}
                className="col-span-1 py-3 px-4 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-medium shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Increment +1
              </button>
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="mt-6 pt-6 border-t border-slate-800/50 min-h-[60px] flex items-center justify-center text-center">
          <p className="text-sm text-yellow-500/90 font-medium">
            {statusMsg || "Ready."}
          </p>
        </div>
      </div>
    </div>
  );
}
