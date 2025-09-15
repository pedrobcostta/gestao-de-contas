export const formatCPF = (value: string) => {
  if (!value) return "";
  const onlyNums = value.replace(/[^\d]/g, "");
  if (onlyNums.length <= 3) return onlyNums;
  if (onlyNums.length <= 6) return `${onlyNums.slice(0, 3)}.${onlyNums.slice(3)}`;
  if (onlyNums.length <= 9) return `${onlyNums.slice(0, 3)}.${onlyNums.slice(3, 6)}.${onlyNums.slice(6)}`;
  return `${onlyNums.slice(0, 3)}.${onlyNums.slice(3, 6)}.${onlyNums.slice(6, 9)}-${onlyNums.slice(9, 11)}`;
};

export const formatRG = (value: string) => {
  if (!value) return "";
  const onlyNums = value.replace(/[^\d]/g, "");
  if (onlyNums.length <= 2) return onlyNums;
  if (onlyNums.length <= 5) return `${onlyNums.slice(0, 2)}.${onlyNums.slice(2)}`;
  if (onlyNums.length <= 8) return `${onlyNums.slice(0, 2)}.${onlyNums.slice(2, 5)}.${onlyNums.slice(5)}`;
  return `${onlyNums.slice(0, 2)}.${onlyNums.slice(2, 5)}.${onlyNums.slice(5, 8)}-${onlyNums.slice(8, 9)}`;
};