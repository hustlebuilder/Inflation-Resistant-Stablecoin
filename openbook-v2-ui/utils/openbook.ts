import {
  findAllMarkets,
  MarketAccount,
  OPENBOOK_PROGRAM_ID,
  OpenBookV2Client,
} from "@openbook-dex/openbook-v2";
import {
  ComputeBudgetProgram,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  Connection,
  AddressLookupTableAccount,
  VersionedTransaction,
  Signer,
} from "@solana/web3.js";
import { useHookConnection, useFakeProvider } from "../hooks/useOpenbookClient";
import { Keypair, TransactionMessage } from "@solana/web3.js";

// MAINNET
// export const RPC = "https://misty-wcb8ol-fast-mainnet.helius-rpc.com/";

export const RPC = process.env.NEXT_PUBLIC_RPC;

// "https://misty-wcb8ol-fast-mainnet.helius-rpc.com/";

// DEVNET
// export const RPC = "https://aimil-f4d13p-fast-devnet.helius-rpc.com/";

const getPrivateKey = (val: string) => {
  return Keypair.fromSecretKey(Buffer.from(JSON.parse(val)));
};

export const wallet = getPrivateKey(process.env.NEXT_PUBLIC_WALLET_PK);

export const openOrdersAdminE = getPrivateKey(
  process.env.NEXT_PUBLIC_OPEN_ORDER_ADMIN_E_PK
);

export const closeMarketAdminE = getPrivateKey(
  process.env.NEXT_PUBLIC_CLOSE_MARKET_ADMIN_E_PK
);

export const consumeEventsAdminE = getPrivateKey(
  process.env.NEXT_PUBLIC_CONSUME_EVENTS_ADMIN_E_PK
);

export const walletTokenAcct4ROKS = new PublicKey(
  "5VNRZzJfk6Cfzxd1giXPitvf5yrdixLTwgKPdKTgLerJ"
); // ROKS container in principal's wallet

export const walletTokenAcct4USDC = new PublicKey(
  "5KGAUASRHPwthAWKooyWMaShoXAy6ogGJn2GP6ChTroX"
);

export const tokenUSDC = new PublicKey(
  "E6oEFEuYUYEt8U5mmKQvzvRUhRmgHCsVpmcyyrPEbCNy"
); // fake usdc

export const tokenROKS = new PublicKey(
  "roksyHbKUYGp2Him7ubyruUXSKXXMy7hZP7u81vxCN8"
);

// export const chainlink = new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"); // chainlink

// from "@openbook-dex/openbook-v2/dist/types"
// this should have been exported from there
interface Market {
  market: string;
  baseMint: string;
  quoteMint: string;
  name: string;
  timestamp: number | null | undefined;
}

const nonceAcct = new PublicKey("GjbJUK45q4AHRa3GHtwgQbcYpGScBPCGkfXLMmZes3rk");

const lookupTableAddress = new PublicKey(
  "3hA6zazrv9cWJ8hMm4oHVgJcPvdSpmAtzZ2bfsRe1LrN"
);

// export const connection = new Connection("https://aimil-f4d13p-fast-devnet.helius-rpc.com/");

const connection = new Connection(RPC);

let lookupTableAccount: AddressLookupTableAccount;
connection.getAddressLookupTable(lookupTableAddress).then((account) => {
  lookupTableAccount = account.value;
});

export const ixAdvanceNonce = async (compUnits: number) => {
  const advanceNonce = SystemProgram.nonceAdvance({
    noncePubkey: nonceAcct,
    authorizedPubkey: wallet.publicKey,
  });
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: compUnits,
  });
  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 20000,
  });
  return [advanceNonce, modifyComputeUnits, addPriorityFee];
};

export const sendVersionedTx = async (
  instructions: TransactionInstruction[],
  additionalSigners: Signer[] = []
) => {
  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  // construct a v0 compatible transaction `Message`
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message([lookupTableAccount]);

  // create a v0 transaction from the v0 message
  const transactionV0 = new VersionedTransaction(messageV0);
  transactionV0.sign([wallet, ...additionalSigners]);

  return await connection.sendTransaction(transactionV0, {
    skipPreflight: true,
  });
};

export const getAccountInfo = async (anchorAccount: string) => {
  const connection = useHookConnection();
  return await connection.getParsedAccountInfo(
    new PublicKey(anchorAccount)
  );
}

export const fetchData = async () => {
  const connection = useHookConnection();
  const provider = useFakeProvider();
  console.log("---> openbook v2 public key: ", OPENBOOK_PROGRAM_ID.toBase58());
  const mkts: string[] = [];
  const uniqueMarkets: Market[] = [];
  const markets = await findAllMarkets(
    connection,
    OPENBOOK_PROGRAM_ID,
    provider
  );
  console.log("==> markets length: ", markets.length);
  markets.forEach((mkt) => {
    if (!mkts.includes(mkt.market)) {
      mkts.push(mkt.market);
      uniqueMarkets.push(mkt);
    }
  });
  console.log("==> uniqueMarkets len: ", uniqueMarkets.length);
  return uniqueMarkets;
};

export const getMarket = async (
  client: OpenBookV2Client,
  publicKey: string
): Promise<MarketAccount> => {
  console.log("--> market selected: ", publicKey);
  let market = null;
  if (!!client.getMarketAccount)
    market = await client.getMarketAccount(new PublicKey(publicKey));
  return market ? market : ({} as MarketAccount);
};
