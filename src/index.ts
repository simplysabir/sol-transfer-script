import * as Web3 from '@solana/web3.js';
import * as fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PROGRAM_ID = new Web3.PublicKey("ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa")
const PROGRAM_DATA_PUBLIC_KEY = new Web3.PublicKey("Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod")


// * this function generates keypair if you don't have otherwise it will directly initialize it
async function initializeKeypair(connection: Web3.Connection): Promise<Web3.Keypair> {
  // * checking whether private key is there or not and if not it will create
  if (!process.env.PRIVATE_KEY) {
    console.log('Generating new keypair... 🗝️');
    const signer = Web3.Keypair.generate();

    console.log('Creating .env file');
    fs.writeFileSync('.env', `PRIVATE_KEY=[${signer.secretKey.toString()}]`);

    // * When generating a keypair
    await airdropSolIfNeeded(signer, connection);

    return signer;
  }
  // * if private key is there then simply initialization will take place
  const secret = JSON.parse(process.env.PRIVATE_KEY ?? '') as number[];
  const secretKey = Uint8Array.from(secret);
  const keypairFromSecret = Web3.Keypair.fromSecretKey(secretKey);

  // * When creating it from the secret key
  await airdropSolIfNeeded(keypairFromSecret, connection);

  return keypairFromSecret;
}

async function airdropSolIfNeeded(
  signer: Web3.Keypair,
  connection: Web3.Connection
) {
  const balance = await connection.getBalance(signer.publicKey);
  console.log('Current balance is', balance / Web3.LAMPORTS_PER_SOL, 'SOL');

  // 1 SOL should be enough for almost anything you wanna do
  if (balance / Web3.LAMPORTS_PER_SOL < 1) {
    // You can only get up to 2 SOL per request 
    console.log('Airdropping 1 SOL');
    const airdropSignature = await connection.requestAirdrop(
      signer.publicKey,
      Web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await connection.getLatestBlockhash();

    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: airdropSignature,
    });

    const newBalance = await connection.getBalance(signer.publicKey);
    console.log('New balance is', newBalance / Web3.LAMPORTS_PER_SOL, 'SOL');
  }
}

// * pinging program
async function pingProgram(connection: Web3.Connection, payer: Web3.Keypair) {
  const transaction = new Web3.Transaction()
  const instruction = new Web3.TransactionInstruction({
    // Instructions need 3 things 
    
    // 1. The public keys of all the accounts the instruction will read/write
    keys: [
      {
        pubkey: PROGRAM_DATA_PUBLIC_KEY,
        isSigner: false,
        isWritable: true
      }
    ],
    
    // 2. The ID of the program this instruction will be sent to
    programId: PROGRAM_ID
    
    // 3. Data - in this case, there's none!
  })

  transaction.add(instruction)
  const transactionSignature = await Web3.sendAndConfirmTransaction(connection, transaction, [payer])

  console.log(
    `Transaction https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    )
}

async function sendSol(connection: Web3.Connection, amount: number, to: Web3.PublicKey, sender: Web3.Keypair) {
    const transaction = new Web3.Transaction()

    const sendSolInstruction = Web3.SystemProgram.transfer(
        {
            fromPubkey: sender.publicKey,
            toPubkey: to, 
            lamports: amount,
        }
    )

    transaction.add(sendSolInstruction)

    const sig = await Web3.sendAndConfirmTransaction(connection, transaction, [sender])
    console.log(`You can view your transaction on the Solana Explorer at:\nhttps://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

async function main() {
  // * making a connection
  const connection = new Web3.Connection(Web3.clusterApiUrl('devnet'));

    // * calling initialization function
  const signer = await initializeKeypair(connection);

  // * for pinging the program
  await pingProgram(connection, signer);

  // * 
  await sendSol(connection, 0.1*Web3.LAMPORTS_PER_SOL, Web3.Keypair.generate().publicKey, signer)
  console.log("Public key:", signer.publicKey.toBase58());
}

main()
  .then(() => {
    console.log('Finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

