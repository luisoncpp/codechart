// @Architecture(descriptionShort="Browser-style pointer history for inspector selections")
export class SelectionHistory {
  private entries: string[] = [];
  private index = -1;

  get canGoBack() {
    return this.index > 0;
  }

  get canGoForward() {
    return this.index >= 0 && this.index < this.entries.length - 1;
  }

  push(id: string) {
    if (this.entries[this.index] === id) return;
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push(id);
    this.index = this.entries.length - 1;
  }

  back() {
    if (!this.canGoBack) return null;
    return this.entries[--this.index];
  }

  forward() {
    if (!this.canGoForward) return null;
    return this.entries[++this.index];
  }

  clear() {
    this.entries = [];
    this.index = -1;
  }
}
