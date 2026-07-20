import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const money = (value:number) => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
export const shortDate = (value:string) => new Intl.DateTimeFormat("en-IN", {day:"numeric",month:"short"}).format(new Date(value.includes("T") ? value : value + "T00:00:00"));
export const expenseLabel = (value:string) => value.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase());
