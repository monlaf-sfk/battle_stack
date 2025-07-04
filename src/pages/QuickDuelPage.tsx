import { useTranslation } from 'react-i18next';

const QuickDuelPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchInitialData();
  }, []);

  if (isLoading) {
    return <DuelLoading t={t} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      // ... existing code ...
    </div>
  );
};

export default QuickDuelPage; 