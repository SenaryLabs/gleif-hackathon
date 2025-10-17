export const Bech32Utils = {
  async toBech32(address: string): Promise<string> {
    // Placeholder: assume already bech32 or return synthetic
    if (address.startsWith('addr_')) return address;
    return 'addr_' + address.slice(0, 20);
  }
};
