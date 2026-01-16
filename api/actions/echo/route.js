import { 
  createPostResponse, 
  ACTION_CORS_HEADERS, 
  ACTIONS_CORS_HEADERS // Use both for compatibility across different wallet versions
} from "@solana/actions";
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} from "@solana/web3.js";

// --- CONFIGURATION ---
// 1. REPLACE THIS with the wallet address where you want to receive the SOL
const DESTINATION_WALLET = new PublicKey("2BL8QZqU5ax7p7WUvRaWbk14bKp9HTsU75BhhYorcuqt"); 

// 2. The Solana Memo Program ID (used to etch the message on-chain)
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXib96qFbncnsvqcPFqGP9asQdrC6iWv");

/**
 * GET Handler: Defines how the Blink looks on X/Twitter
 */
export const GET = async (req) => {
  const baseURL = new URL(req.url).origin;
  
  const payload = {
    title: "The Eternal Echo",
    icon: `${baseURL}/star-preview.png`, // Make sure this image exists in your /public folder
    description: "Your voice, immortalized in the starfield. Choose a tier to cast your Echo.",
    label: "Cast Echo",
    links: {
      actions: [
        {
          label: "Standard (0.001 SOL)",
          href: "/api/actions/echo?tier=standard",
        },
        {
          label: "Premium (0.04 SOL)",
          href: "/api/actions/echo?tier=premium",
        },
        {
          label: "LEGENDARY (0.2 SOL)",
          href: "/api/actions/echo?tier=legendary",
        }
      ]
    }
  };

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
};

/**
 * OPTIONS Handler: Necessary for CORS preflight checks (Wallets require this!)
 */
export const OPTIONS = async () => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};

/**
 * POST Handler: Builds the actual transaction
 */
export const POST = async (req) => {
  try {
    const body = await req.json();
    const url = new URL(req.url);
    const tier = url.searchParams.get("tier") || "standard";
    
    // The user's wallet address (provided by the Blink-aware client)
    const account = new PublicKey(body.account);
    
    // Connect to the Solana Mainnet
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

    // Define pricing for each tier
    const pricing = {
      standard: 0.001 * LAMPORTS_PER_SOL,
      premium: 0.04 * LAMPORTS_PER_SOL,
      legendary: 0.2 * LAMPORTS_PER_SOL
    };

    const cost = pricing[tier];

    // Create the transaction
    const transaction = new Transaction();

    // 1. Add the Payment Instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: DESTINATION_WALLET,
        lamports: cost,
      })
    );

    // 2. Add the Memo Instruction (This marks the tier on the blockchain)
    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: account, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(`[${tier.toUpperCase()}] New Echo from Blink`, "utf-8"),
      })
    );

    // Set the fee payer and recent blockhash
    transaction.feePayer = account;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Build the response that the wallet will sign
    const payload = await createPostResponse({
      fields: {
        transaction: transaction,
        message: `Your ${tier} Echo is being written to the stars!`,
      },
    });

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });

  } catch (err) {
    console.error("Action Error:", err);
    return Response.json(
      { message: "Transaction failed to build." }, 
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }
};
