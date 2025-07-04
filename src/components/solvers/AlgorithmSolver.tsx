  const handleLocalCodeChange = (newCode: string | undefined) => {
    const codeToSave = newCode || '';
    setCode(codeToSave);
    onCodeChange(language, codeToSave);
  }; 