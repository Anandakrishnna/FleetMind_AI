export const money = (value:number) => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
export const shortDate = (value:string) => new Intl.DateTimeFormat("en-IN", {day:"numeric",month:"short"}).format(new Date(value));
export const expenseLabel = (value:string) => value.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase());
