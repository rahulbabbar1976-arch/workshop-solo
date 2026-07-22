const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

const fn = `
  const handleAddPayment = async () => {
    const val = parseFloat(paymentAmountInput);
    if (isNaN(val) || val <= 0) return alert("Enter a valid amount");
    const newAmount = amountPaid + val;
    try {
      const res = await fetch(\`/api/jobcards/\${jobCard.id}\`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaid: newAmount, editorId: profile?.id })
      });
      if (res.ok) {
        setAmountPaid(newAmount);
        setPaymentAmountInput("");
        setIsAddingPayment(false);
      } else {
        alert("Failed to save payment");
      }
    } catch (e) {
      alert("Error saving payment");
    }
  };
`;

if (!code.includes('handleAddPayment =')) {
  code = code.replace('  return (', fn + '\\n  return (');
  fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
  console.log('Function added');
} else {
  console.log('Function already exists');
}
