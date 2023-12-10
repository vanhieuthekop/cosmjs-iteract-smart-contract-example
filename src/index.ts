import { readFile } from "fs/promises"
import { SigningCosmWasmClient, MsgExecuteContractEncodeObject } from "@cosmjs/cosmwasm-stargate"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { toUtf8 } from "@cosmjs/encoding";
import _ from 'lodash';

const rpc = "https://rpc.euphoria.aura.network"

const runAll = async(): Promise<void> => {
  const aliceSigner: OfflineDirectSigner = await DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.alice.mnemonic.key")).toString(), {
    prefix: "aura",});
  const alice = (await aliceSigner.getAccounts())[0].address
  const signingClient = await SigningCosmWasmClient.connectWithSigner(rpc, aliceSigner)

  const marketplaceContract = "aura1sxfyrcqsymqq4zgllzd3gg209w2rq4rcaza3t8c3drzyfzhzk56q2t07zn"
  // 1. Create collection
  const collectionContract = await createCollection(marketplaceContract, "My collection", "MC1", alice, signingClient)
  console.log('collectionContract', collectionContract)

  // 2. Mint NFT
  await mintNft(marketplaceContract, collectionContract, '1', alice, signingClient);

  // 3. Approve for marketplace
  await approveForMarketplace(marketplaceContract, collectionContract, '1', alice, signingClient);

  // 4. List NFT
  await listNft(marketplaceContract, collectionContract, '1', alice, signingClient);

  // 5. Buy NFT
  await buyNFT(marketplaceContract, collectionContract, '1');
}

async function createCollection(marketplaceContract: string, name: string, symbol: string, singer: string, signingClient: SigningCosmWasmClient){
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
      contract: marketplaceContract,
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

async function mintNft(marketplaceContract: string, collectionContract: string, tokenId: string, singer: string, signingClient: SigningCosmWasmClient){
  const msg = {
    mint_nft: {
      contract_address: collectionContract,
      token_id: tokenId,
      token_uri: 'google.com'
    }
  }
  const sendMsg: MsgExecuteContractEncodeObject = {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: {
      sender: singer,
      contract: marketplaceContract,
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

  console.log("Mint nft , tx hash:", tx.transactionHash);
}

async function listNft(marketplaceContract: string, collectionContract: string, tokenId: string,  singer: string, signingClient: SigningCosmWasmClient) {
  const msg = {
    list_nft: {
      contract_address: collectionContract,
      token_id: tokenId,
      listing_config: {
        price: {
          amount: "1000",
          denom: "ueaura"
        },
        start_time: {
          at_height: 7252528
        },
        end_time: {
          at_height: 7752528
        }
      }
    }
  }

  const sendMsg: MsgExecuteContractEncodeObject = {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: {
      sender: singer,
      contract: marketplaceContract,
      msg: toUtf8(JSON.stringify(msg)),
    }
  }

  const tx = await signingClient.signAndBroadcast(singer, [sendMsg],
    {
      gas: "500000",
      amount: [{
        denom: "ueaura",
        amount: "1000"
      }]
    });

  console.log("List nft , tx hash:", tx);
}

async function approveForMarketplace(marketplaceContract: string, collectionContract: string, tokenId: string, singer: string, signingClient: SigningCosmWasmClient) {
  const msg = {
    approve: {
      spender: marketplaceContract,
      expires: {
        never: {}
      },
      token_id: tokenId,
    }
  }

  const sendMsg: MsgExecuteContractEncodeObject = {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: {
      sender: singer,
      contract: collectionContract,
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

  console.log("Approve for marketplace , tx hash:", tx);
}

async function buyNFT(marketplaceContract: string, collectionContract: string, tokenId: string) {
  const bobSigner: OfflineDirectSigner = await DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.bob.mnemonic.key")).toString(), {
    prefix: "aura",});
  const bob = (await bobSigner.getAccounts())[0].address
  const signingClient = await SigningCosmWasmClient.connectWithSigner(rpc, bobSigner)
  console.log('bob', bob);
    
  const msg = {
    buy: {
      contract_address: collectionContract,
      token_id: tokenId,
    }
  }

  const sendMsg: MsgExecuteContractEncodeObject = {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: {
      sender: bob,
      contract: marketplaceContract,
      msg: toUtf8(JSON.stringify(msg)),
      funds: [{
        denom: "ueaura",
        // NFT price here
        amount: "1000"
      }]
    }
  }

  const tx = await signingClient.signAndBroadcast(bob, [sendMsg],
    {
      gas: "500000",
      amount: [{
        denom: "ueaura",
        amount: "836"
      }]
    });

  console.log("Buy nft , tx hash:", tx);
}

runAll()