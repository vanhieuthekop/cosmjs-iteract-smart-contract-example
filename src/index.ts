import { readFile } from "fs/promises"
import { SigningCosmWasmClient, IndexedTx, MsgExecuteContractEncodeObject } from "@cosmjs/cosmwasm-stargate"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { toUtf8 } from "@cosmjs/encoding";
import _ from 'lodash';

const rpc = "https://rpc.euphoria.aura.network"

const runAll = async(): Promise<void> => {
  const aliceSigner: OfflineDirectSigner = await DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.alice.mnemonic.key")).toString(), {
    prefix: "aura",});
  const alice = (await aliceSigner.getAccounts())[0].address
  const signingClient = await SigningCosmWasmClient.connectWithSigner(rpc, aliceSigner)

  // 1. Create collection
  const collectionContract = await createCollection("My collection", "MC1", alice, signingClient)
  console.log('collectionContract', collectionContract)

  // 2. Mint NFT
  await mintNft(collectionContract, '1', alice, signingClient);
}

async function createCollection(name: string, symbol: string, singer: string, signingClient: SigningCosmWasmClient){
  const msg = {
    create_collection: {
      name,
      symbol
    }
  }
  const sendMsg: MsgExecuteContractEncodeObject = {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: {
      sender: singer,
      contract: "aura1sxfyrcqsymqq4zgllzd3gg209w2rq4rcaza3t8c3drzyfzhzk56q2t07zn",
      msg: toUtf8(JSON.stringify(msg)),
    }
  }

  const tx = await signingClient.signAndBroadcast(singer, [sendMsg],
    {
      gas: "500000",
      amount: [{
        denom: "ueaura",
        amount: "836"
      }]
    });

  const rawLog = JSON.parse(tx.rawLog || '');
  const eventData = _.mapValues(_.keyBy(rawLog[0].events[rawLog[0].events.length-1].attributes, 'key'), 'value');
  console.log("create collection tx", eventData);

  return eventData.collection_contract;
}

async function mintNft(collection_contract: string, token_id: string, singer: string, signingClient: SigningCosmWasmClient){
  const msg = {
    mint_nft: {
      contract_address: collection_contract,
      token_id: token_id,
      token_uri: 'google.com'
    }
  }
  const sendMsg: MsgExecuteContractEncodeObject = {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: {
      sender: singer,
      contract: "aura1sxfyrcqsymqq4zgllzd3gg209w2rq4rcaza3t8c3drzyfzhzk56q2t07zn",
      msg: toUtf8(JSON.stringify(msg)),
    }
  }

  const tx = await signingClient.signAndBroadcast(singer, [sendMsg],
    {
      gas: "500000",
      amount: [{
        denom: "ueaura",
        amount: "836"
      }]
    });

  console.log("Mint nft successfully, tx hash:", tx.transactionHash);
}

runAll()