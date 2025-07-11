const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send("This project is deployed by CI/CD Jenkins jai mata di 11 july");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
