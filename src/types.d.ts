type KeyBech = 'acc' | 'val' | 'cons';

interface AccountKey {
  address: string;
  name?: string;
  public?: string;
  mnemonic?: string;
  private?: string;
}

interface EthKey extends AccountKey {}

interface CosmosKey extends AccountKey {}
