import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background" dir="rtl">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-7xl font-light text-muted-foreground/30">404</h1>
                        <div className="h-0.5 w-16 bg-border mx-auto"></div>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-medium text-foreground">הדף לא נמצא</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            הדף <span className="font-medium text-foreground">"{pageName}"</span> לא נמצא באפליקציה.
                        </p>
                    </div>
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-secondary rounded-lg border border-border">
                            <p className="text-sm text-muted-foreground">הערת מנהל: ייתכן שדף זה טרם נוצר.</p>
                        </div>
                    )}
                    <div className="pt-6">
                        <button onClick={() => window.location.href = '/'} className="inline-flex items-center px-4 py-2 text-sm font-medium text-foreground bg-secondary border border-border rounded-lg hover:bg-primary/10 transition-colors">
                            חזרה לדשבורד
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}