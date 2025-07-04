  <div className="flex-grow">
    <CodeEditor
      value={code}
      language={language}
      onChange={(value) => setCode(value || '')}
      theme="vs-dark"
      height="400px"
    />
  </div>
</div>

<div className="mt-8">
  <h3 className="text-2xl font-semibold mb-4 text-white">Result</h3>
  <div className="bg-gray-800 p-6 rounded-lg">
    <AnimatePresence>
      <SubmissionResult
        submission={submissionResult}
        t={t}
      />
    </AnimatePresence>
  </div>
</div>

<div className="mt-8">
  <div className="flex justify-end space-x-4"> 